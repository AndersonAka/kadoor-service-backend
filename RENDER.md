# Documentation Render - Déploiement du Backend

Ce guide explique comment déployer le backend NestJS de KADOOR SERVICE sur la plateforme Render.

## 📋 Table des matières

1. [Présentation de Render](#présentation-de-render)
2. [Prérequis](#prérequis)
3. [Configuration du projet](#configuration-du-projet)
4. [Variables d'environnement](#variables-denvironnement)
5. [Déploiement](#déploiement)
6. [Migrations de base de données](#migrations-de-base-de-données)
7. [Post-déploiement](#post-déploiement)
8. [Dépannage](#dépannage)

---

## 🎯 Présentation de Render

Render est une plateforme cloud moderne qui offre :
- **Déploiement automatique** depuis Git (GitHub, GitLab, Bitbucket)
- **SSL gratuit** pour tous les services
- **Mise à l'échelle automatique** selon la charge
- **Health checks** automatiques
- **Logs en temps réel**
- **Intégration facile** avec bases de données externes (comme Neon)

Site web : [https://render.com](https://render.com)

---

## ✅ Prérequis

Avant de déployer sur Render, assurez-vous d'avoir :

- **Compte Render** (créer un compte gratuit sur [render.com](https://render.com))
- **Repository Git** (GitHub, GitLab ou Bitbucket) avec votre code
- **Base de données Neon** configurée (voir [NEON.md](./NEON.md))
- **Node.js** 18+ (déjà configuré dans le projet)

---

## ⚙️ Configuration du projet

Le projet est déjà configuré pour Render avec le fichier `render.yaml`.

### Fichier render.yaml

```yaml
services:
  - type: web
    name: kadoor-service-backend
    runtime: node
    plan: free
    region: frankfurt
    buildCommand: npm install && npm run build && npx prisma generate
    startCommand: npm run start:prod
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    healthCheckPath: /
    branch: main
```

**Notes importantes :**
- Le `buildCommand` inclut la génération du client Prisma (`npx prisma generate`)
- Le port est fixé à `10000` (Render utilisera automatiquement le port assigné via `process.env.PORT`)
- La branche par défaut est `main` (ajustez selon votre branche principale)

---

## 🔐 Variables d'environnement

Vous devez configurer les variables d'environnement suivantes dans le dashboard Render :

### Variables requises

| Variable | Description | Où l'obtenir |
|----------|-------------|--------------|
| `DATABASE_URL` | URL de connexion PostgreSQL (Neon) | Depuis Neon Console ou `neonctl` |
| `JWT_SECRET` | Clé secrète pour signer les tokens JWT | Générée automatiquement ou définie manuellement |
| `NODE_ENV` | Environnement d'exécution | Définie automatiquement à `production` |

### Variables optionnelles

| Variable | Description | Exemple |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | ID client Google OAuth | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Secret client Google OAuth | `xxx` |
| `EMAIL_HOST` | Serveur SMTP | `smtp.gmail.com` |
| `EMAIL_PORT` | Port SMTP | `587` |
| `EMAIL_USER` | Email pour l'envoi | `noreply@kadoorservice.com` |
| `EMAIL_PASS` | Mot de passe email | `xxx` |

### Comment configurer dans Render

1. Connectez-vous au [dashboard Render](https://dashboard.render.com)
2. Sélectionnez votre service
3. Allez dans **Environment** (dans le menu de gauche)
4. Cliquez sur **Add Environment Variable**
5. Ajoutez chaque variable avec sa valeur

**⚠️ Important :** Ne commitez jamais vos clés secrètes dans Git ! Utilisez toujours les variables d'environnement.

---

## 🚀 Déploiement

### Méthode 1 : Déploiement automatique via Git (Recommandé)

1. **Connecter votre repository**
   - Allez sur [dashboard.render.com](https://dashboard.render.com)
   - Cliquez sur **New +** → **Web Service**
   - Connectez votre compte GitHub/GitLab/Bitbucket si nécessaire
   - Sélectionnez votre repository `kadoor-service-backend`

2. **Configurer le service**
   - Render détectera automatiquement le fichier `render.yaml`
   - Si ce n'est pas le cas, configurez manuellement :
     - **Name** : `kadoor-service-backend`
     - **Runtime** : `Node`
     - **Build Command** : `npm install && npm run build && npx prisma generate`
     - **Start Command** : `npm run start:prod`
     - **Plan** : `Free` (pour commencer)

3. **Configurer les variables d'environnement**
   - Ajoutez toutes les variables requises (voir section précédente)
   - **DATABASE_URL** : URL de votre base de données Neon

4. **Déployer**
   - Cliquez sur **Create Web Service**
   - Render commencera automatiquement le build et le déploiement
   - Suivez les logs en temps réel

### Méthode 2 : Déploiement via Render CLI

```bash
# Installer Render CLI
npm install -g render-cli

# Se connecter
render login

# Déployer depuis render.yaml
render deploy
```

### Déploiement manuel (sans render.yaml)

Si vous préférez configurer manuellement :

1. **Créez un nouveau Web Service**
2. **Configuration :**
   - **Root Directory** : `/` (ou laissez vide)
   - **Environment** : `Node`
   - **Build Command** : `npm install && npm run build && npx prisma generate`
   - **Start Command** : `npm run start:prod`
   - **Plan** : Choisissez selon vos besoins

---

## 📦 Migrations de base de données

Les migrations Prisma doivent être exécutées après le déploiement.

### Option 1 : Via Render Shell (Recommandé)

1. Dans le dashboard Render, allez dans votre service
2. Cliquez sur **Shell** dans le menu de gauche
3. Exécutez les migrations :

```bash
npx prisma migrate deploy
```

### Option 2 : Via Render Script (Script de build personnalisé)

Vous pouvez ajouter l'exécution des migrations dans le `buildCommand` :

```yaml
buildCommand: npm install && npm run build && npx prisma generate && npx prisma migrate deploy
```

**⚠️ Attention :** Cette méthode exécutera les migrations à chaque build. Utilisez avec précaution.

### Option 3 : Via prisma db push (Développement uniquement)

Pour un environnement de développement/test :

```bash
npx prisma db push
```

**Note :** `db push` ne crée pas d'historique de migration et peut être destructif. Utilisez uniquement en développement.

---

## 🔄 Post-déploiement

### Vérifier le déploiement

1. **Vérifier les logs**
   - Dans le dashboard Render, section **Logs**
   - Vérifiez qu'il n'y a pas d'erreurs
   - Le message `Application is running on: http://localhost:...` devrait apparaître

2. **Tester l'API**
   - Votre API sera accessible à : `https://kadoor-service-backend.onrender.com` (ou votre URL personnalisée)
   - Testez le health check : `GET https://votre-url.onrender.com/`
   - Testez Swagger : `GET https://votre-url.onrender.com/api/docs`

3. **Vérifier la base de données**
   - Connectez-vous à votre base Neon
   - Vérifiez que les tables ont été créées
   - Testez une requête simple

### Seed la base de données (optionnel)

Si vous avez un script de seed :

```bash
# Via Render Shell
npm run prisma:seed
```

**Note :** Assurez-vous que le seed ne supprime pas de données importantes en production.

---

## 🔍 Dépannage

### Erreur : "Module not found" ou erreurs d'import

**Solution :**
- Vérifiez que `npm install` s'exécute correctement
- Assurez-vous que `prisma generate` est exécuté dans le buildCommand
- Vérifiez que tous les fichiers nécessaires sont committés dans Git

### Erreur : "DATABASE_URL is not defined"

**Solution :**
- Vérifiez que la variable `DATABASE_URL` est définie dans Render
- Format attendu : `postgresql://user:password@host/database?sslmode=require`
- Assurez-vous qu'il n'y a pas d'espaces ou de retours à la ligne

### Erreur : "Port already in use" ou timeout

**Solution :**
- Render assigne automatiquement le port via `process.env.PORT`
- Vérifiez que `main.ts` utilise `process.env.PORT ?? 3001` (déjà configuré)
- Ne hardcodez jamais un port spécifique

### Erreur : "Prisma Client not generated"

**Solution :**
- Assurez-vous que `npx prisma generate` est dans le buildCommand
- Vérifiez que `prisma/schema.prisma` est présent dans le repository
- Vérifiez les logs de build pour voir si `prisma generate` s'exécute

### Le service se met en pause (plan gratuit)

**Solution :**
- Le plan gratuit met en pause les services après 15 minutes d'inactivité
- Le premier appel après la pause peut prendre 30-60 secondes pour réveiller le service
- Pour éviter cela, utilisez un plan payant ou configurez un "ping" automatique

### Migrations échouent

**Solution :**
- Vérifiez que `DATABASE_URL` est correcte
- Vérifiez les permissions de la base de données
- Exécutez les migrations manuellement via Render Shell pour voir les erreurs détaillées

### CORS errors depuis le frontend

**Solution :**
- Vérifiez la configuration CORS dans `src/main.ts`
- Assurez-vous que `origin: true` est configuré (déjà en place)
- En production, vous pouvez spécifier des origines précises :

```typescript
app.enableCors({
  origin: ['https://votre-frontend.com', 'https://www.votre-frontend.com'],
  credentials: true,
});
```

---

## 📊 Monitoring et Logs

### Consulter les logs

1. **Dans le dashboard Render :**
   - Section **Logs** de votre service
   - Logs en temps réel et historique

2. **Via CLI :**
```bash
render logs --service kadoor-service-backend
```

### Health Checks

Render vérifie automatiquement la santé de votre service via `healthCheckPath: /`

Vous pouvez créer un endpoint de health check personnalisé :

```typescript
// src/app.controller.ts
@Get('health')
health() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```

---

## 🔒 Sécurité en production

### Recommandations

1. **JWT_SECRET** : Utilisez une clé forte générée aléatoirement
2. **CORS** : Limitez les origines autorisées en production
3. **Variables d'environnement** : Ne jamais commiter de secrets
4. **HTTPS** : Render fournit SSL automatiquement (activé par défaut)
5. **Rate limiting** : Considérez l'ajout d'un middleware de rate limiting

---

## 📚 Ressources supplémentaires

- **Documentation Render :** [https://render.com/docs](https://render.com/docs)
- **Guide Node.js sur Render :** [https://render.com/docs/node](https://render.com/docs/node)
- **Environnement variables :** [https://render.com/docs/environment-variables](https://render.com/docs/environment-variables)
- **Logs et debugging :** [https://render.com/docs/log-streams](https://render.com/docs/log-streams)
- **Support Render :** [https://render.com/docs/support](https://render.com/docs/support)

---

## 📝 Checklist de déploiement

Avant de déployer, vérifiez :

- [ ] Repository Git connecté et à jour
- [ ] `render.yaml` présent dans le repository
- [ ] `DATABASE_URL` configurée dans Render (URL Neon)
- [ ] `JWT_SECRET` définie (générée automatiquement ou manuellement)
- [ ] Toutes les variables d'environnement optionnelles configurées si nécessaire
- [ ] Scripts `build` et `start:prod` fonctionnent localement
- [ ] Migrations Prisma testées localement
- [ ] Health check endpoint accessible (ou endpoint `/`)
- [ ] CORS configuré correctement pour le frontend
- [ ] Logs vérifiés après le premier déploiement

---

**Dernière mise à jour :** Janvier 2025  
**Version Node.js requise :** 18+
