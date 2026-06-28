from base_de_donnees import obtenir_connexion
connexion = obtenir_connexion()
if connexion is not None:
    curseur = connexion.cursor()
    curseur.execute("select database()")
    resultat = curseur.fetchone()
    print("connecte a :", resultat)
    connexion.close()