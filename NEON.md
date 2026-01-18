# Documentation Neon - Déploiement de la Base de Données

Ce guide explique comment déployer la base de données PostgreSQL sur la plateforme Neon pour le projet KADOOR SERVICE.

## 📋 Table des matières

1. [Présentation de Neon](#présentation-de-neon)
2. [Prérequis](#prérequis)
3. [Installation de neonctl](#installation-de-neonctl)
4. [Authentification](#authentification)
5. [Création d'un projet](#création-dun-projet)
6. [Configuration de la connexion](#configuration-de-la-connexion)
7. [Migrations Prisma](#migrations-prisma)
8. [Commandes utiles](#commandes-utiles)
9. [Dépannage](#dépannage)

---

## 🎯 Présentation de Neon

Neon est une plateforme PostgreSQL serverless qui offre :
- **Mise à l'échelle automatique** : Ajuste les ressources selon la charge
- **Branches instantanées** : Créez des copies de votre base de données pour le développement
- **Pause automatique** : Économise les ressources en pause inactives
- **Point-in-time recovery** : Restauration à n'importe quel moment
- **Connexion sans serveur** : Pas de gestion de serveurs manuelle

Site web : [https://neon.tech](https://neon.tech)

---

## ✅ Prérequis

Avant de commencer, assurez-vous d'avoir :

- **Node.js** version 18 ou supérieure installé
- Un **compte Neon** (créer un compte gratuit sur [console.neon.tech](https://console.neon.tech))
- Un **projet NestJS** avec Prisma configuré (déjà en place pour ce projet)

---

## 🔧 Installation de neonctl

`neonctl` est l'outil en ligne de commande officiel pour interagir avec Neon.

### Installation globale (optionnelle)

```bash
npm install -g neonctl
```

### Installation via npx (recommandé)

Vous pouvez utiliser `neonctl` sans l'installer globalement :

```bash
npx neonctl@latest [command]
```

**Version installée :** `2.20.1`

---

## 🔐 Authentification

Pour utiliser `neonctl`, vous devez vous authentifier avec votre compte Neon.

### Méthode 1 : OAuth (recommandé)

```bash
npx neonctl@latest auth
```

Cette commande ouvrira votre navigateur pour autoriser l'accès à votre compte Neon.

### Méthode 2 : API Key

1. Créez une clé API depuis [Neon Console](https://console.neon.tech/settings/api-keys)
2. Configurez la clé :

```bash
npx neonctl@latest auth --api-key YOUR_API_KEY
```

Ou définissez la variable d'environnement :

```bash
export NEON_API_KEY=your_api_key_here
```

---

## 🚀 Création d'un projet

Une fois authentifié, créez un nouveau projet Neon pour votre base de données.

### Création simple

```bash
npx neonctl@latest projects create --name kadoor-service-db
```

### Création avec options avancées

```bash
npx neonctl@latest projects create \
  --name kadoor-service-db \
  --region-id aws-eu-central-1 \
  --database kadoorservice \
  --role kadoorservice_owner
```

**Régions disponibles :**
- `aws-us-west-2` (Oregon, USA)
- `aws-ap-southeast-1` (Singapour)
- `aws-ap-southeast-2` (Sydney, Australie)
- `aws-eu-central-1` (Francfort, Allemagne) ⭐ **Recommandé pour l'Europe**
- `aws-us-east-2` (Ohio, USA)
- `aws-us-east-1` (Virginie, USA)
- `azure-eastus2` (USA Est)

**Exemple de sortie :**

```
Project created successfully!
Project ID: proj_xxxxxxxxxxxxx
Connection string: postgresql://user:password@ep-xxxx-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### Récupérer les informations du projet

```bash
# Lister tous les projets
npx neonctl@latest projects list

# Obtenir les détails d'un projet spécifique
npx neonctl@latest projects get --project-id YOUR_PROJECT_ID

# Obtenir l'URL de connexion
npx neonctl@latest projects connection-string --project-id YOUR_PROJECT_ID
```

---

## ⚙️ Configuration de la connexion

Une fois le projet créé, configurez la variable d'environnement `DATABASE_URL`.

### Créer/Modifier le fichier .env

Créez un fichier `.env` à la racine du projet (s'il n'existe pas déjà) :

```bash
# .env
DATABASE_URL="postgresql://user:password@ep-xxxx-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"
```

**⚠️ Important :** 
- Ajoutez `.env` à votre `.gitignore` pour ne pas commiter les identifiants
- L'URL doit inclure `?sslmode=require` pour la connexion sécurisée

### Format de l'URL de connexion Neon

```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

Exemple :
```
postgresql://kadoorservice_owner:secret123@ep-cool-darkness-123456.eu-central-1.aws.neon.tech/kadoorservice?sslmode=require
```

### Variables d'environnement multiples

Pour gérer différents environnements (dev, staging, production) :

```bash
# .env.development
DATABASE_URL="postgresql://..."

# .env.production
DATABASE_URL="postgresql://..."
```

---

## 📦 Migrations Prisma

Une fois la connexion configurée, exécutez les migrations Prisma pour créer le schéma de base de données.

### 1. Vérifier la connexion

```bash
npx prisma db pull
```

### 2. Appliquer les migrations

```bash
# Déployer toutes les migrations
npx prisma migrate deploy

# Ou en mode développement (crée une nouvelle migration)
npx prisma migrate dev
```

### 3. Générer le client Prisma

```bash
npx prisma generate
```

### 4. Seed la base de données (optionnel)

```bash
npm run prisma:seed
```

---

## 🛠️ Commandes utiles

### Gestion des projets

```bash
# Lister tous les projets
npx neonctl@latest projects list

# Obtenir les détails d'un projet
npx neonctl@latest projects get --project-id PROJECT_ID

# Supprimer un projet
npx neonctl@latest projects delete --project-id PROJECT_ID

# Obtenir l'URL de connexion
npx neonctl@latest projects connection-string --project-id PROJECT_ID
```

### Gestion des branches (environnements)

```bash
# Lister les branches
npx neonctl@latest branches list --project-id PROJECT_ID

# Créer une nouvelle branche
npx neonctl@latest branches create --project-id PROJECT_ID --name staging

# Supprimer une branche
npx neonctl@latest branches delete --project-id PROJECT_ID --branch-id BRANCH_ID
```

### Gestion des endpoints

```bash
# Lister les endpoints
npx neonctl@latest endpoints list --project-id PROJECT_ID

# Créer un endpoint
npx neonctl@latest endpoints create --project-id PROJECT_ID --branch-id BRANCH_ID
```

### Informations système

```bash
# Version de neonctl
npx neonctl@latest --version

# Aide sur une commande
npx neonctl@latest projects create --help

# Afficher la configuration actuelle
npx neonctl@latest config show
```

---

## 🔍 Dépannage

### Erreur : "DATABASE_URL n'est pas défini"

**Solution :** Vérifiez que le fichier `.env` existe et contient `DATABASE_URL`.

```bash
# Vérifier le fichier .env
cat .env | grep DATABASE_URL
```

### Erreur : "Connection refused" ou timeout

**Solutions :**
1. Vérifiez que l'URL de connexion est correcte
2. Assurez-vous que `?sslmode=require` est présent dans l'URL
3. Vérifiez que le projet Neon n'est pas en pause (il se réveille automatiquement)

### Erreur : "Authentication failed"

**Solutions :**
1. Vérifiez vos identifiants dans l'URL de connexion
2. Régénérez le mot de passe dans Neon Console
3. Récupérez une nouvelle URL de connexion :

```bash
npx neonctl@latest projects connection-string --project-id YOUR_PROJECT_ID
```

### Le projet est en pause

Les projets Neon gratuits se mettent en pause après inactivité. La première requête les réveille automatiquement (peut prendre quelques secondes).

Pour éviter la pause, utilisez un plan payant ou un endpoint qui reste actif.

### Migrations échouent

**Solution :** Vérifiez que vous utilisez la bonne URL et que le client Prisma est à jour :

```bash
# Réinitialiser le client
npx prisma generate

# Vérifier le statut des migrations
npx prisma migrate status
```

---

## 📚 Ressources supplémentaires

- **Documentation officielle Neon :** [https://neon.tech/docs](https://neon.tech/docs)
- **Documentation neonctl :** [https://neon.tech/docs/reference/cli-reference](https://neon.tech/docs/reference/cli-reference)
- **Guide Prisma + Neon :** [https://neon.tech/docs/guides/prisma](https://neon.tech/docs/guides/prisma)
- **Console Neon :** [https://console.neon.tech](https://console.neon.tech)
- **Discord Community :** [https://discord.gg/neondatabase](https://discord.gg/neondatabase)

---

## 📝 Notes importantes

1. **Sécurité** : Ne commitez jamais vos URLs de connexion ou clés API dans Git
2. **Backup** : Neon inclut des backups automatiques, mais pensez à configurer vos propres backups pour la production
3. **Limites** : Le plan gratuit a des limites (storage, compute). Consultez [neon.tech/pricing](https://neon.tech/pricing)
4. **Performance** : Les projets en pause ont un léger délai au démarrage. Pour la production, utilisez un plan payant

---

**Dernière mise à jour :** Janvier 2025  
**Version neonctl :** 2.20.1
