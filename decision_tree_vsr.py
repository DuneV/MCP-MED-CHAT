# app/decision_tree_vsr.py

decision_tree_vsr = {
    "id": "inicio",
    "pregunta": "¿Es temporada VSR?",
    "si": {
        "id": "eligibilidad",
        "pregunta": "¿Edad del paciente en meses?",
        "inputType": "number",
        "unidad": "meses",
        "rangos": [
            {
                "min": 0,
                "max": 0.1,  # 72 horas = 0.1 meses aprox
                "texto": "Recién nacido (≤72 horas)",
                "next_id": "rn_madre"
            },
            {
                "min": 0.1,
                "max": 8,
                "texto": "Lactante (72h a 8 meses)",
                "next_id": "lac_madre"
            },
            {
                "min": 8,
                "max": None,
                "texto": "Mayor de 8 meses",
                "next_id": "alto_riesgo"
            }
        ]
    },
    "no": {
        "resultado": "NO RECOMENDADO",
        "detalle": "Fuera de la temporada VSR."
    },
    # Nodos subsiguientes
    "rn_madre": {
        "id": "rn_madre",
        "pregunta": "¿La madre recibió vacuna VSR?",
        "si": {
            "id": "rn_post",
            "pregunta": "¿Nació dentro de los 14 días posteriores a la vacunación materna?",
            "si": {
                "resultado": "NO RECOMENDADO",
                "detalle": "Por posible caso individual. Reevaluar factores clínicos."
            },
            "no": {
                "id": "rn_prev",
                "pregunta": "¿El RN tiene patología materna o neonatal severa?",
                "si": {
                    "resultado": "NO RECOMENDADO",
                    "detalle": "Revisar caso con especialista."
                },
                "no": {
                    "resultado": "RECOMENDADO",
                    "detalle": "50 mg (5 mL) dosis única IM."
                }
            }
        },
        "no": {
            "resultado": "RECOMENDADO",
            "detalle": "50 mg (5 mL) dosis única IM."
        }
    },

    "lac_madre": {
        "id": "lac_madre",
        "pregunta": "¿La madre recibió vacuna VSR?",
        "si": {
            "id": "lac_post",
            "pregunta": "¿El lactante nació dentro de los 14 días posteriores a la vacunación?",
            "si": {
                "resultado": "NO RECOMENDADO",
                "detalle": "Protección materna insuficiente, evaluar individualmente."
            },
            "no": {
                "id": "lac_prev",
                "pregunta": "¿Ha recibido dosis de nirsevimab previamente?",
                "si": {
                    "resultado": "NO RECOMENDADO",
                    "detalle": "Ya recibió dosis previa."
                },
                "no": {
                    "id": "peso",
                    "pregunta": "¿Cuál es el peso actual en kilogramos?",
                    "inputType": "number",
                    "unidad": "kg",
                    "rangos": [
                        {
                            "min": 0,
                            "max": 5,
                            "resultado": "RECOMENDADO",
                            "detalle": "50 mg (5 mL) dosis única IM."
                        },
                        {
                            "min": 5,
                            "max": None,
                            "resultado": "RECOMENDADO",
                            "detalle": "100 mg (1 mL) dosis única IM."
                        }
                    ]
                }
            }
        },
        "no": {
            "resultado": "DESCONOCIDO",
            "detalle": "Vacunación materna no confirmada."
        }
    },

    "alto_riesgo": {
        "id": "alto_riesgo",
        "pregunta": "¿Cumple criterios de alto riesgo?",
        "si": {
            "resultado": "RECOMENDADO",
            "detalle": "200 mg (2 mL) dosis única IM en grupo de alto riesgo."
        },
        "no": {
            "resultado": "NO RECOMENDADO",
            "detalle": "Sin criterios de riesgo, fuera del rango etario."
        }
    }
}
