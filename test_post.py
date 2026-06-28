import requests

url = "http://127.0.0.1:5000/produits"

data = {
    "nom_produit": "Nike Air Max",
    "description_produit": "Chaussure confortable",
    "prix": 15000,
    "id_vendeur": 1
}

response = requests.post(url, json=data)

print("STATUS :", response.status_code)
print("RESPONSE :", response.json())