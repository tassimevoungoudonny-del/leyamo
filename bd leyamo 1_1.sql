-- ============================================
-- LEYAMO V1.1 – BASE DE DONNÉES COMPLÈTE
-- ============================================

-- Créer la base si elle n'existe pas
CREATE DATABASE IF NOT EXISTS leyamo1_1;
USE leyamo1_1;

-- ============================================
-- TABLE ADMIN
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE VENDEURS (la plus importante)
-- ============================================
CREATE TABLE IF NOT EXISTS vendeurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    num_whatsapp VARCHAR(20),
    localisation_boutique VARCHAR(100),
    localisation_detaillee VARCHAR(255),
    nom_boutique VARCHAR(100),
    statut ENUM('en_attente', 'valide', 'refuse') DEFAULT 'en_attente',
    motif_refus TEXT,
    email_confirme BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE PRODUITS
-- ============================================
CREATE TABLE IF NOT EXISTS produits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom_produit VARCHAR(100) NOT NULL,
    description_produit TEXT,
    prix INT NOT NULL,
    categorie VARCHAR(50),
    genre ENUM('masculin', 'feminin', 'unisexe') DEFAULT 'unisexe',
    id_vendeur INT NOT NULL,
    vues INT DEFAULT 0,
    clic_whatsapp INT DEFAULT 0,
    image_url VARCHAR(255),
    statut ENUM('en_attente', 'valide', 'refuse') DEFAULT 'en_attente',
    motif_refus TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_vendeur) REFERENCES vendeurs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_produit_par_vendeur (nom_produit, id_vendeur)
);

-- ============================================
-- TABLE IMAGES PRODUITS
-- ============================================
CREATE TABLE IF NOT EXISTS images_produits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produit_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    ordre INT DEFAULT 0,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE EMAIL TOKENS
-- ============================================
CREATE TABLE IF NOT EXISTS email_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL,
    type ENUM('confirmation', 'reset') DEFAULT 'confirmation',
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_expiration TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 24 HOUR)
);

-- ============================================
-- TABLE NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    destinataire ENUM('admin', 'vendeur') NOT NULL,
    destinataire_id INT NOT NULL,
    message TEXT NOT NULL,
    lu BOOLEAN DEFAULT FALSE,
    lien VARCHAR(255),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE SIGNALEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS signalements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produit_id INT NOT NULL,
    motif VARCHAR(100) NOT NULL,
    description TEXT,
    statut ENUM('en_attente', 'traite') DEFAULT 'en_attente',
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip VARCHAR(45),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ADMIN PAR DÉFAUT (email: admin@leyamo.com / mot de passe: admin123)
-- ============================================
INSERT INTO admins (email, mot_de_passe, nom)
SELECT 'admin@leyamo.com', '$2b$12$9mXTHSEhQnC/23fR9l7UY.6JO5xN6KpG/5WqNhjYhv/xQ3wAsS2ii', 'Administrateur'
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE email = 'admin@leyamo.com');

-- ============================================
-- VÉRIFICATION
-- ============================================
SHOW TABLES;
SELECT * FROM admins;
SELECT id, email, email_confirme FROM vendeurs LIMIT 0;