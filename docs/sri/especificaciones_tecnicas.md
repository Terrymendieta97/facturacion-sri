# Especificaciones Técnicas del SRI (Ecuador)

## 1. Estructura de la Clave de Acceso (49 dígitos)

La Clave de Acceso identifica unívocamente a cada comprobante electrónico emitido en el Ecuador:

```
[ddMMyyyy][TC][RUC][AMB][EST][PE][SECUENCIAL][COD_NUMERICO][TE][DIGITO_VERIFICADOR]
```

| Posición | Longitud | Campo | Descripción | Ejemplo |
| :---: | :---: | :--- | :--- | :--- |
| 1 - 8 | 8 | **Fecha de Emisión** | Formato `ddMMyyyy` | `24092026` |
| 9 - 10 | 2 | **Tipo de Comprobante** | `01`: Factura, `04`: Nota de Crédito, `07`: Retención | `01` |
| 11 - 23 | 13 | **RUC del Emisor** | 13 dígitos numéricos | `1105164683001` |
| 24 | 1 | **Tipo de Ambiente** | `1`: Pruebas, `2`: Producción | `2` |
| 25 - 27 | 3 | **Establecimiento** | 3 dígitos (ej. Matriz: `001`) | `001` |
| 28 - 30 | 3 | **Punto de Emisión** | 3 dígitos (ej. Caja 1: `001`) | `001` |
| 31 - 39 | 9 | **Secuencial** | 9 dígitos con ceros a la izquierda | `000000005` |
| 40 - 47 | 8 | **Código Numérico** | 8 dígitos aleatorios generados dinámicamente | `40675261` |
| 48 | 1 | **Tipo de Emisión** | `1`: Emisión Normal | `1` |
| 49 | 1 | **Dígito Verificador** | Calculado con algoritmo **Módulo 11** | `4` |

---

## 2. Algoritmo Módulo 11

El dígito verificador se calcula con los primeros 48 dígitos usando factores ponderados del 2 al 7 de derecha a izquierda:
* Si el residuo es `0` $\rightarrow$ Dígito = `0`
* Si el residuo es `1` $\rightarrow$ Dígito = `1`
* En otro caso $\rightarrow$ Dígito = `11 - residuo`

---

## 3. Endpoints SOAP Oficiales del SRI

### Ambiente 1: Pruebas / Certificación
* **Recepción:** `https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl`
* **Autorización:** `https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl`

### Ambiente 2: Producción
* **Recepción:** `https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl`
* **Autorización:** `https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl`
