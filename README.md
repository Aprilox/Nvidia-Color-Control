# 🖥️ Nvidia Color Control

Un gestionnaire de profils d'affichage moderne et fluide pour Windows, conçu spécialement pour les utilisateurs de cartes graphiques NVIDIA. 

Cette application permet de contourner les limitations du Panneau de Configuration NVIDIA en offrant une interface rapide, esthétique et des fonctionnalités de sécurité pour vos réglages de couleurs.

## ✨ Fonctionnalités

- **Gestion de Profils** : Créez, nommez et personnalisez plusieurs profils (Gaming, Film, Nuit, etc.).
- **Contrôle Précis** : Ajustez le Gamma, la Luminosité, le Contraste et l'Éclat Numérique (Digital Vibrance).
- **Éclat Numérique (Digital Vibrance)** : Mapping 1:1 parfait avec les paramètres NVIDIA (0-100%).
- **Bouton Rétablir (Soft Reset)** : Remettez instantanément l'écran aux paramètres d'usine sans perdre vos réglages dans l'application.
- **Sécurité (Confirmation)** : Un délai de confirmation de 7 secondes après application pour éviter les écrans noirs ou illisibles.
- **Interface Moderne** : Design sombre (Glassmorphism) avec animations fluides et visualisation de la courbe Gamma.

## 🚀 Installation & Utilisation

1. Téléchargez l'exécutable `nvidia-color-control.exe`.
2. Lancez l'application (aucune installation requise).
3. Sélectionnez votre écran en haut de la fenêtre.
4. Ajustez les curseurs et cliquez sur **APPLIQUER**.
5. Confirmez les changements dans les 7 secondes pour les conserver.

## 🛠️ Développement (Tech Stack)

Le projet est construit avec :
- **Backend** : [Go](https://go.dev/) avec le framework [Wails v2](https://wails.io/).
- **Frontend** : HTML5 / Vanilla CSS / JavaScript (ES6+).
- **Utilitaires** : Intégration de commandes bas niveau pour le contrôle Gamma et NVAPI.

### Build du projet

Pour compiler l'application vous-même :
```bash
wails build
```

## ⚖️ Licence

Ce projet est destiné à un usage personnel. L'utilisation est à vos propres risques concernant les réglages matériels de vos écrans.
