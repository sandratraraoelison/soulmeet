# Test du coach vocal sur le web

Dans le chat du coach de l’application `web`, cliquez sur **Parler au coach**, choisissez français ou anglais avant de démarrer et autorisez le microphone. Faites une pause après votre phrase : le texte est envoyé au coach existant, sa réponse est lue, puis l’écoute reprend automatiquement. **Arrêter le vocal** coupe le micro, la lecture et la requête en cours. Le texte reste accessible dans la conversation.

Utilisez Chrome avec un microphone, sur `http://localhost:3001` ou HTTPS. La compatibilité dépend du navigateur et de ses services vocaux. Cette version fonctionne par tours de parole ; pour interrompre une réponse, arrêtez puis relancez le vocal. Le clavier est désactivé pendant la session vocale.

La reconnaissance et la synthèse utilisent les API Web Speech du navigateur : aucune clé ni service vocal payant ajouté. La reconnaissance peut nécessiter Internet et transmettre l’audio au fournisseur du navigateur. Soulmeet utilise la transcription avec le même traitement que les messages écrits.

Le fournisseur IA du backend reste inchangé. Pour un test sans API IA payante, le backend prend déjà en charge Ollama : démarrer Ollama, télécharger `llama3.1:8b`, configurer `LLM_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://localhost:11434` et `OLLAMA_MODEL=llama3.1:8b` dans l’environnement de test, puis redémarrer le backend. Le modèle tourne sur votre machine et nécessite des ressources locales.

Vérifications manuelles : autorisation et refus du micro ; une phrase suivie d’une réponse audible ; reprise de l’écoute après lecture ; arrêt pendant l’écoute, la génération et la lecture ; navigation hors du chat ; navigateur incompatible et coupure réseau. Les tests automatisés simulent les API vocales ; un essai avec un vrai microphone reste nécessaire.

Référence : [Web Speech API sur MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API).
