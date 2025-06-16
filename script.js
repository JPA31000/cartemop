document.addEventListener('DOMContentLoaded', () => {
    // --- Éléments du DOM ---
    const cartesSourceContainer = document.getElementById('cartes-source');
    const cartesCibleContainer = document.getElementById('cartes-cible');
    const timerElement = document.getElementById('timer');
    const messageFinContainer = document.getElementById('message-fin');
    const messageTexteElement = document.getElementById('message-texte');
    const rejouerBtn = document.getElementById('rejouer-btn');

    // --- Données du Jeu ---
    // Les cartes dans le désordre pour l'affichage initial
const CARTES_JEU = ["ESQ", "APS", "APD", "PRO", "EXE", "VISA", "DET", "DOE"];
// L'ordre correct pour la vérification
const ORDRE_CORRECT = ["ESQ", "APS", "APD", "PRO", "VISA", "EXE", "DET", "DOE"];

    // Noms complets pour l'affichage des info-bulles
    const NOMS_COMPLETS = {
        ESQ: 'Esquisse',
        APS: 'Avant-projet sommaire',
        APD: 'Avant-projet d\xE9finitif',
        PRO: 'Projet',
        VISA: 'Visa',
        EXE: "\xC9tudes d'ex\xE9cution",
        DET: "Direction de l'ex\xE9cution des travaux",
        DOE: 'Dossier des ouvrages ex\xE9cut\xE9s'
    };
    
    let tempsRestant = 120; // 2 minutes en secondes
    let minuteur;
    let carteEnCoursDeDrag = null;

    // --- Fonctions du Jeu ---

    /**
     * Mélange un tableau en utilisant l'algorithme de Fisher-Yates.
     * C'est un excellent moyen de garantir un mélange vraiment aléatoire.
     */
    function melanger(tableau) {
        for (let i = tableau.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tableau[i], tableau[j]] = [tableau[j], tableau[i]];
        }
    }

    /**
     * Crée et affiche les cartes et les cibles dans le DOM.
     */
    function creerPlateauDeJeu() {
        // Vider les conteneurs au cas où on rejoue
        cartesSourceContainer.innerHTML = '';
        cartesCibleContainer.innerHTML = '';
        messageFinContainer.classList.add('hidden');

        // Mélanger les cartes avant de les afficher
        let cartesMelangees = [...CARTES_JEU];
        melanger(cartesMelangees);
        
        // Créer les éléments HTML pour chaque carte
        cartesMelangees.forEach(nomCarte => {
            const carte = document.createElement('div');
            carte.classList.add('carte');
            carte.setAttribute('draggable', 'true'); // Indispensable pour le drag-and-drop
            carte.id = nomCarte; // L'id nous servira pour la vérification
            carte.textContent = nomCarte;
            carte.title = NOMS_COMPLETS[nomCarte] || nomCarte;
            cartesSourceContainer.appendChild(carte);
        });

        // Créer les emplacements cibles
        ORDRE_CORRECT.forEach((_, index) => {
            const cible = document.createElement('div');
            cible.classList.add('cible');
            cible.dataset.index = index; // On stocke l'index de la cible
            cartesCibleContainer.appendChild(cible);
        });

        ajouterListenersDragAndDrop();
    }

    /**
     * Démarre le minuteur et met à jour l'affichage chaque seconde.
     */
    function demarrerMinuteur() {
        minuteur = setInterval(() => {
            tempsRestant--;
            let minutes = Math.floor(tempsRestant / 60);
            let secondes = tempsRestant % 60;
            // Ajoute un zéro devant si les secondes sont < 10 (ex: 1:09)
            timerElement.textContent = `${minutes}:${secondes < 10 ? '0' : ''}${secondes}`;

            if (tempsRestant <= 0) {
                terminerPartie(false); // Temps écoulé, c'est perdu
            }
        }, 1000);
    }

    /**
     * Ajoute tous les écouteurs d'événements pour le glisser-déposer.
     */
    function ajouterListenersDragAndDrop() {
        const cartes = document.querySelectorAll('.carte');
        const cibles = document.querySelectorAll('.cible');

        // Pour chaque carte...
        cartes.forEach(carte => {
            carte.addEventListener('dragstart', (e) => {
                carteEnCoursDeDrag = e.target;
                e.target.classList.add('dragging');
            });

            // Support tactile
            carte.addEventListener('touchstart', (e) => {
                carteEnCoursDeDrag = e.target;
                e.target.classList.add('dragging');
                e.preventDefault();
            }, { passive: false });

            carte.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
                carteEnCoursDeDrag = null;
            });

            carte.addEventListener('touchend', (e) => {
                e.target.classList.remove('dragging');
                const touch = e.changedTouches[0];
                const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                if (elem) {
                    const cible = elem.closest('.cible');
                    if (cible && cible.children.length === 0) {
                        cible.appendChild(carteEnCoursDeDrag);
                    } else if (elem.closest('#cartes-source')) {
                        cartesSourceContainer.appendChild(carteEnCoursDeDrag);
                    }

                    if (cartesCibleContainer.querySelectorAll('.carte').length === ORDRE_CORRECT.length) {
                        verifierOrdre();
                    }
                }
                carteEnCoursDeDrag = null;
            });

            carte.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });
        });

        // Pour chaque cible...
        cibles.forEach(cible => {
            cible.addEventListener('dragover', (e) => {
                e.preventDefault(); // Comportement par défaut à annuler pour autoriser le 'drop'
                e.target.classList.add('hovered');
            });

            cible.addEventListener('dragleave', (e) => {
                e.target.classList.remove('hovered');
            });

            cible.addEventListener('drop', (e) => {
                e.preventDefault();
                e.target.classList.remove('hovered');

                // Si la cible est vide, on y place la carte
                if (e.target.children.length === 0 && e.target.classList.contains('cible')) {
                    // Retirer les indicateurs de l'ancienne cible si besoin
                    const ancienneCible = carteEnCoursDeDrag.parentElement;
                    if (ancienneCible && ancienneCible.classList.contains('cible')) {
                        ancienneCible.classList.remove('correct', 'incorrect');
                    }

                    e.target.appendChild(carteEnCoursDeDrag);

                    // Vérifie immédiatement si la carte est bien placée
                    const attendu = ORDRE_CORRECT[parseInt(e.target.dataset.index, 10)];
                    if (carteEnCoursDeDrag.id === attendu) {
                        e.target.classList.add('correct');
                        e.target.classList.remove('incorrect');
                    } else {
                        e.target.classList.add('incorrect');
                        e.target.classList.remove('correct');
                    }
                }

                // Vérifier si toutes les cartes sont placées
                if (cartesCibleContainer.querySelectorAll('.carte').length === ORDRE_CORRECT.length) {
                    verifierOrdre();
                }
            });
        });
        
        // Permet de redéposer une carte dans la zone de départ
         cartesSourceContainer.addEventListener('dragover', (e) => e.preventDefault());
         cartesSourceContainer.addEventListener('drop', (e) => {
             e.preventDefault();
             const ancienneCible = carteEnCoursDeDrag.parentElement;
             if (ancienneCible && ancienneCible.classList.contains('cible')) {
                 ancienneCible.classList.remove('correct', 'incorrect');
             }
             cartesSourceContainer.appendChild(carteEnCoursDeDrag);
         });
    }
    
    /**
     * Vérifie si l'ordre des cartes déposées est correct.
     */
    function verifierOrdre() {
        const cibles = cartesCibleContainer.querySelectorAll('.cible');
        let estCorrect = true;
        cibles.forEach((cible, index) => {
            const carteDansCible = cible.querySelector('.carte');
            // Si une cible est vide ou si l'id de la carte ne correspond pas à l'ordre correct
            if (!carteDansCible || carteDansCible.id !== ORDRE_CORRECT[index]) {
                estCorrect = false;
            }
        });
        terminerPartie(estCorrect);
    }

    /**
     * Met fin à la partie, affiche le message et stoppe le minuteur.
     */
    function terminerPartie(aGagne) {
        clearInterval(minuteur); // Arrête le décompte
        
        if (aGagne) {
            messageTexteElement.innerHTML = "Félicitations ! Vous avez trouvé le bon ordre ! 🎉";
        } else {
            messageTexteElement.innerHTML = `Dommage ! Le temps est écoulé ou l'ordre est incorrect.<br>Le bon ordre est : ${ORDRE_CORRECT.join(' -> ')}`;
        }
        messageFinContainer.classList.remove('hidden');
    }

    /**
     * Réinitialise le jeu pour une nouvelle partie.
     */
    function rejouer() {
        tempsRestant = 120;
        clearInterval(minuteur);
        timerElement.textContent = "2:00";
        initialiserJeu();
    }

    /**
     * Fonction principale qui lance le jeu.
     */
    function initialiserJeu() {
        creerPlateauDeJeu();
        demarrerMinuteur();
    }
    
    // Ajoute l'événement sur le bouton rejouer
    rejouerBtn.addEventListener('click', rejouer);

    // --- Lancement du Jeu ---
    initialiserJeu();
});