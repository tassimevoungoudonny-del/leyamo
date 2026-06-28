CREATE DATABASE leyamov1;
USE leyamov1;
CREATE TABLE  vendeurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(30) not null,
    email VARCHAR(100) not null,
    mot_de_passe VARCHAR(255) not null,
    num_whatsapp VARCHAR(20) not null,
    nom_boutique VARCHAR(50),
    localisation_boutique VARCHAR(100),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE produits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_vendeur INT,
    nom_produit VARCHAR(100) not null,
    description_produit VARCHAR(255),
    categorie varchar(50),
    prix INT not null,
    vues INT DEFAULT 0,
    clic_whatsapp INT DEFAULT 0,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_vendeur) REFERENCES vendeurs(id) 
    on delete cascade
);
SHOW TABLES;

select* from produits
