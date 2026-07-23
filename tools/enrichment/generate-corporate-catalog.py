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

# Piloto verificado a mano (nombre real + imagen oficial) para los productos "Más pedido"
# (clientesDistintos >= 15). Investigado por código de barra contra sitios de fabricante /
# retailers de referencia — ver conversación del 2026-07-22. El resto del catálogo sigue
# usando el nombre crudo del sistema de origen hasta que se amplíe este piloto.
VERIFIED_NAMES = {
    "7793742003431": "Dermaglós Solar FPS50 Emulsión x 250 ml",
    "7702003010774": "Curitas Apósito Adhesivo Transpiel x 10 Unidades",
    "7798026345269": "Hipoalergic Pore Cinta Adhesiva Microporosa 2,5 cm x 9 m",
    "7791848054500": "Pervinox Solución Tópica x 60 ml",
    "99900031": "Guantes de Cirugía Nipro N° 8 1/2 (par)",
    "7702003010750": "Curitas Apósito Adhesivo Tela Elástica x 10 Unidades",
    "7795375579000": "Platsul-A Crema x 30 g",
    "7797321000620": "Gasana Venda Elástica Tipo Cambric 10 cm x 3 m",
    "7797321000057": "Gasana Gasa N°5 10x10 cm Caja x 10 Sobres",
    "7797321000606": "Gasana Venda Tipo Cambric 5 cm x 3 m",
    "7798021991973": "Tablada Agua Oxigenada 10 Vol. Frasco Gotero x 100 ml",
    "7798021991010": "Tablada Agua Oxigenada 10 Vol. x 250 ml",
    "2046": "Rigecin Solución Fisiológica x 500 ml",
    "7797321000613": "Gasana Venda Tipo Cambric 7 cm x 3 m",
    "1527": "Tijera de Curación Recta 14 cm",
    "4968420512588": "Guantes de Cirugía Nipro N° 8 (par)",
    "7795368001419": "Gota PC Descongestivo Baño Ocular x 80 ml",
    "7798021991072": "Tablada Solución Fisiológica Frasco Gotero x 100 ml",
    "8002660035653": "Influvac Tetra Vacuna Antigripal Jeringa Prellenada x 0,5 ml",
    "7790139003623": "Bialcohol Alcohol Etílico 96° x 1000 ml",
    "7791848055309": "Pervinox Solución Tópica x 120 ml",
    "7790139003616": "Bialcohol Alcohol Etílico 96° x 250 ml",
    "4968420500349": "Guantes de Látex para Examen Nipro Talle M x 100",
    "7798021991003": "Tablada Agua Oxigenada 10 Vol. x 100 ml",
    "7798028009961": "Lisfar Pinza para Depilar Recta Niquelada",
    "7790064101814": "Estrella Algodón Super Practipack x 75 g",
    "652": "Copita Lava Ojos",
    "7702003010736": "Curitas Apósito Adhesivo Tela Elástica x 20 Unidades",
    "7797321000019": "Gasana Gasa N°1 10x10 cm Caja x 10 Sobres",
    "4968420500356": "Guantes de Látex para Examen Nipro Talle L x 100",
    "7798026345252": "Hipoalergic Pore Cinta Adhesiva Microporosa 1,25 cm x 9 m",
    "4580193651389": "Citizen Termómetro Clínico Digital CTA-301C",
    "7793742007118": "Dermaglós Facial Serum Ácido Hialurónico x 30 ml",
}

# Imagen real descargada del fabricante/retailer (public/img/productos/<barcode>.<ext>).
VERIFIED_IMAGES = {
    "7702003010736": "7702003010736.webp",
    "7702003010750": "7702003010750.webp",
    "7702003010774": "7702003010774.webp",
    "7790139003616": "7790139003616.webp",
    "7790139003623": "7790139003623.webp",
    "7791848054500": "7791848054500.webp",
    "7791848055309": "7791848055309.png",
    "7793742003431": "7793742003431.jpg",
    "7793742007118": "7793742007118.jpg",
    "7795368001419": "7795368001419.png",
    "7795375579000": "7795375579000.webp",
    "7797321000019": "7797321000019.webp",
    "7797321000620": "7797321000620.webp",
    "7798021991003": "7798021991003.jpg",
    "7798021991010": "7798021991010.jpg",
    "7798021991973": "7798021991973.jpg",
    "7798026345252": "7798026345252.webp",
    "7798026345269": "7798026345269.webp",
}

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

        name = VERIFIED_NAMES.get(barcode, clean_name(raw_name))
        image = VERIFIED_IMAGES.get(barcode)

        product = {
            "sku": sku,
            "barcode": barcode,
            "name": name,
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
            "image": f"public/img/productos/{image}" if image else None,
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
