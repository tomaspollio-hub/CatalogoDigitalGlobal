"""
Genera src/products.json a partir de:
  - Herramienta_Presupuestos_v3.xlsx (hoja "Productos"): lo que Ventas Corporativas vende hoy,
    con métricas reales de clientes distintos / unidades por período.
  - Grupos_de_Productos_10-7-2026.xlsx: maestro con Fabricante, Familia (categoría) y SKU.

Corre una sola vez a mano (no forma parte del build). Fuente de verdad: los dos Excel en
~/Descargas. No commitear los Excel al repo.
"""
import json
import re
import unicodedata
import pandas as pd

PRESUPUESTOS = "/home/tomas/Descargas/Herramienta_Presupuestos_v3.xlsx"
MAESTRO = "/home/tomas/Descargas/Grupos_de_Productos_10-7-2026.xlsx"
OUT = "/home/tomas/CatalogoDigitalGlobal/src/products.json"

JUNK_NAMES = {"ENVIO A DOMICILIO", "ENVIO POR CORREO", "GIFT CARD", "APLICACION", "ZPRUEBA"}

CODE_CATEGORY = {
    "LIMP": "Limpieza",
    "PE.LI": "Cosmética y Cuidado Personal",
    "PE.MA": "Cosmética y Cuidado Personal",
    "PE.AC": "Cosmética y Cuidado Personal",
    "COSM": "Cosmética y Cuidado Personal",
    "NUT/DIE": "Vitaminas y Suplementos",
    "PAÑAL": "Pañales y Cuidado Infantil",
    "A.A.V.O": "Antisépticos y Curación",
    "AC.MA": "Insumos Descartables",
    "AC.DE": "Insumos Descartables",
    "AC.ME": "Equipamiento Médico",
    "ORTOP": "Ortopedia",
    "DENT": "Higiene Dental",
    "ALM": "Alimentos y Snacks",
    "ALIM": "Alimentos y Snacks",
    "BYN": "Bebés y Puericultura",
    "VAR": "Varios",
    "REGALO": "Varios",
    "OPTI": "Cuidado Ocular",
}

# Reglas para Familia "ética" (sin código de rubro, o con sufijo VL = venta libre).
# Primer match gana. Se aplican sobre la Familia sin acentos y en mayúsculas.
KEYWORD_CATEGORY = [
    (["HIPNOTIC", "ANSIOLIT"], "Otros Medicamentos"),  # se marcan controlado aparte
    (["BOTIQUIN"], "Primeros Auxilios"),
    (["ANTIBIOTIC", "ANTIBACTERIAN"], "Antibióticos"),
    (["ANTIHISTAMIN", "ANTIALERGIC", "ANTIGRIPAL", "ANTITUSIV", "EXPECTORANT",
      "MUCOLITIC", "BRONCODILATAD", "DESCONGESTIVO NASAL", "ANTIASMATIC"], "Antigripales y Antialérgicos"),
    (["ANTISEPTIC"], "Antisépticos y Curación"),
    (["ANTIACID", "ANTIULCEROS", "ANTIEMETIC", "ANTIDIARREIC", "EVACUANTE",
      "LAXANTE", "COLAGOGO", "HEPATOPROTECTOR", "DIGESTIVO", "REHIDRATANTE ORAL",
      "ANTIFLATULENT"], "Digestivo"),
    (["VITAMINIC", "POLIVITAMINIC", "SUPLEMENTO", "BIOENERGIZANTE",
      "RECONSTITUYENTE", "REGENERADOR DEL CARTILAGO"], "Vitaminas y Suplementos"),
    (["ANALGESIC", "ANTIINFLAMATORI", "ANTIRREUMATIC", "ANTIESPASMODIC",
      "MIORRELAJANTE", "ANTIFEBRIL", "ANESTESIC"], "Analgésicos y Antiinflamatorios"),
]

CONTROLLED_MARKERS = ["HIPNOTIC", "ANSIOLIT", "PSICOTROP", "ESTUPEFAC"]
CONTROLLED_NAME_FALLBACK = ["TRAMADOL", "MIDAZOLAM", "SOMIT", "ROHYPNOL", "MORFINA", "FENTANIL"]


def strip_accents(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def clean_name(raw):
    return " ".join(str(raw).split()).title()


def presentation_from_raw(raw):
    m = re.search(r"X\s*(\d.*)$", str(raw).strip())
    if not m:
        return ""
    return "x " + m.group(1).strip()


def categorize(familia_raw):
    if not isinstance(familia_raw, str) or not familia_raw.strip():
        return "Otros Medicamentos"
    m = re.search(r"\(([^)]+)\)\s*$", familia_raw)
    if m:
        code = m.group(1).strip()
        if code in CODE_CATEGORY:
            return CODE_CATEGORY[code]
        base = familia_raw[: m.start()].strip()
    else:
        base = familia_raw.strip()
    base_norm = strip_accents(base).upper()
    for keywords, category in KEYWORD_CATEGORY:
        if any(kw in base_norm for kw in keywords):
            return category
    return "Otros Medicamentos"


def is_controlled(familia_raw, name_raw):
    familia_norm = strip_accents(str(familia_raw)).upper() if isinstance(familia_raw, str) else ""
    if any(m in familia_norm for m in CONTROLLED_MARKERS):
        return True
    name_norm = strip_accents(str(name_raw)).upper()
    return any(kw in name_norm for kw in CONTROLLED_NAME_FALLBACK)


def main():
    pres = pd.read_excel(PRESUPUESTOS, sheet_name="Productos", header=0)
    pres.columns = ["producto", "barcode", "marca", "clientes", "unidades"]
    pres["barcode_str"] = pres["barcode"].astype(str)

    master = pd.read_excel(MAESTRO, sheet_name="ag-grid", header=0)
    master["Barras_str"] = master["Barras"].apply(lambda x: str(int(x)) if pd.notna(x) else None)
    master_sorted = master.sort_values(by=["Estado"])  # Estado 1 antes que 3 (baja)
    master_by_barcode = (
        master_sorted.dropna(subset=["Barras_str"])
        .drop_duplicates(subset=["Barras_str"], keep="first")
        .set_index("Barras_str")
    )

    merged = pres.join(master_by_barcode, on="barcode_str", rsuffix="_m")

    products = []
    stats = {"excluidos_servicio": 0, "excluidos_baja": 0, "sin_stock": 0,
              "a_consultar_sin_maestro": 0, "controlados": [], "categorias": {}}

    seen_skus = set()

    for i, row in merged.iterrows():
        raw_name = str(row["producto"]).strip()

        if raw_name.upper() in JUNK_NAMES:
            stats["excluidos_servicio"] += 1
            continue
        if raw_name.startswith("{") or raw_name.startswith("}"):
            stats["excluidos_baja"] += 1
            continue

        matched = isinstance(row.get("Familia"), str)
        familia = row.get("Familia") if matched else None
        fabricante = row.get("Fabricante") if matched else None
        estado = row.get("Estado") if matched else None

        barcode = row["barcode_str"]
        if barcode in ("nan", "—", "-", "None"):
            barcode = ""

        controlado = is_controlled(familia, raw_name)
        category = categorize(familia)

        if controlado:
            disponibilidad = "a_consultar"
        elif not matched:
            disponibilidad = "a_consultar"
            stats["a_consultar_sin_maestro"] += 1
        elif estado == 3:
            disponibilidad = "sin_stock"
            stats["sin_stock"] += 1
        else:
            disponibilidad = "disponible"

        brand = str(row["marca"]).strip().title() if isinstance(row["marca"], str) else ""
        manufacturer = str(fabricante).strip().title() if isinstance(fabricante, str) else (brand or "Sin especificar")

        sku = None
        if matched:
            codigo_ext = row.get("Código externo")
            if isinstance(codigo_ext, str) and codigo_ext.strip():
                sku = codigo_ext.strip()
            elif pd.notna(row.get("ID")):
                sku = str(int(row["ID"]))
        if not sku:
            sku = "C" + (barcode if barcode else f"SINBC{i}")
        base_sku = sku
        n = 2
        while sku in seen_skus:
            sku = f"{base_sku}-{n}"
            n += 1
        seen_skus.add(sku)

        description = f"Categoría: {category}."
        if manufacturer and manufacturer != "Sin especificar":
            description = f"Comercializado por {manufacturer}. " + description

        product = {
            "sku": sku,
            "barcode": barcode,
            "name": clean_name(raw_name),
            "brand": brand or manufacturer,
            "manufacturer": manufacturer,
            "category": category,
            "presentation": presentation_from_raw(raw_name),
            "minMultiple": 1,
            "disponibilidad": disponibilidad,
            "controlado": controlado,
            "description": description,
            "clientesDistintos": int(row["clientes"]),
            "unidadesPeriodo": int(row["unidades"]),
        }
        products.append(product)

        if controlado:
            stats["controlados"].append(product["name"])
        stats["categorias"][category] = stats["categorias"].get(category, 0) + 1

    products.sort(key=lambda p: p["unidadesPeriodo"], reverse=True)

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    print(f"Total publicado: {len(products)}")
    print(f"Excluidos (línea de servicio): {stats['excluidos_servicio']}")
    print(f"Excluidos (dados de baja, prefijo {{): {stats['excluidos_baja']}")
    print(f"Sin stock (baja en maestro, Estado 3): {stats['sin_stock']}")
    print(f"A consultar (sin match en maestro): {stats['a_consultar_sin_maestro']}")
    print(f"Controlados ({len(stats['controlados'])}): {stats['controlados']}")
    print("Categorías:")
    for cat, count in sorted(stats["categorias"].items(), key=lambda x: -x[1]):
        print(f"  {count:4d}  {cat}")


if __name__ == "__main__":
    main()
