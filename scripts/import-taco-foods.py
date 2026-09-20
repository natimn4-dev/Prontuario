#!/usr/bin/env python3
"""Generate the local TACO food catalog from the official NEPA/UNICAMP workbook.

Usage:
  python scripts/import-taco-foods.py /path/to/taco.xlsx src/data/taco-foods.json

The generated file contains only the seven nutrients used by the dietary
calculator. `Tr` (trace) and `NA` (not applicable) are encoded as zero because
the current calculator contract requires non-negative numbers. Rows with a
blank or `*` (analysis under review) in one of those nutrients are excluded so
that missing data is never presented as a measured zero. The original workbook
remains the authoritative source.
"""

from __future__ import annotations

import json
import hashlib
import sys
from pathlib import Path

from openpyxl import load_workbook


EXPECTED_SHA256 = "a66b8ec528daeabc63bc2b015fc9bd8c6d76b941c2fc0ed93a4311d449302d14"
KNOWN_CATEGORIES = {
    "Cereais e derivados",
    "Verduras, hortaliças e derivados",
    "Frutas e derivados",
    "Gorduras e óleos",
    "Pescados e frutos do mar",
    "Carnes e derivados",
    "Leite e derivados",
    "Bebidas (alcoólicas e não alcoólicas)",
    "Ovos e derivados",
    "Produtos açucarados",
    "Miscelâneas",
    "Outros alimentos industrializados",
    "Alimentos preparados",
    "Leguminosas e derivados",
    "Nozes e sementes",
}


def number(value: object) -> float:
    if not isinstance(value, (int, float)):
        return 0
    return round(float(value), 6)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Informe o arquivo TACO .xlsx e o JSON de destino.")
    source, destination = map(Path, sys.argv[1:])
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash != EXPECTED_SHA256:
        raise SystemExit(
            f"Arquivo TACO diferente do validado: {source_hash}; esperado: {EXPECTED_SHA256}."
        )
    workbook = load_workbook(source, data_only=True, read_only=True)
    sheet = workbook["CMVCol taco3"]
    category = "Outros"
    foods: list[dict[str, object]] = []

    for row in sheet.iter_rows(values_only=True):
        if isinstance(row[0], str) and row[0] in KNOWN_CATEGORIES:
            category = row[0]
            continue
        if not isinstance(row[0], (int, float)) or not isinstance(row[1], str):
            continue
        nutrient_cells = (row[3], row[5], row[8], row[6], row[9], row[11], row[17])
        if any(value == "*" or value is None or (isinstance(value, str) and not value.strip()) for value in nutrient_cells):
            continue
        foods.append(
            {
                "id": str(int(row[0])),
                "description": row[1].strip(),
                "category": category,
                "nutrientsPer100g": {
                    "energyKcal": number(row[3]),
                    "proteinG": number(row[5]),
                    "carbohydratesG": number(row[8]),
                    "fatG": number(row[6]),
                    "fiberG": number(row[9]),
                    "calciumMg": number(row[11]),
                    "sodiumMg": number(row[17]),
                },
            }
        )

    if len(foods) != 566:
        raise SystemExit(f"Catálogo inesperado: {len(foods)} alimentos; esperado: 566.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(foods, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
