// Toutes les fonctions du jeu.
// ----------------------------
    // Vérification joueurs,
    // Prépa. avant lancer partie,
    // Déroulement partie,
    // Fin de partie et retour salon.

    var usersCtrl = require('./routes/usersCtrl');


// Require.

module.exports = {
    gameSettings: (playerList, idGame, io, socket) => {
        var io = io;

        const GAME_CONFIG = {coins: 50, bank: 0, color:['blue', 'red', 'yellow', 'green'], position: [1, 6, 11, 16]};
        const BANKGOALS = 50;
        const BOARD = 20;
        const BOXES = {chance: [5, 10, 15, 20], money: [3, 8, 13, 18], resources: [1, 6, 11, 16], attack: [9, 19], bank: [7, 17], benefit: [2, 12], empty: [4, 14]};
        const RESOURCES = {bread: 1, meat: 6, salad: 11, sauce: 16};
        const RESOURCES_PRICE = 50;
        const MONEY = [50, 25, 15, 0, 100, 75, 50];
        const BENEFIT = 10; // En pourcent.
        const CHANCE = { giveForEveryone: [5, 15, 25], giveForOne: [30, 40, 50], getFromEveryone: [5, 15, 25], getFromOne: [30, 40, 50], makeLoseOrWin: [60, 40, 30]};

        var player = [];
        var nextPlayer;
        var cptPlayer = 0;

        var viewPhaser = false;


        // Modification des players pour accueillir infos de jeu.
        var j = 0;
        playerList.forEach(element => {
            element.coins = GAME_CONFIG.coins;
            element.color = GAME_CONFIG.color[j];
            element.bank = GAME_CONFIG.bank;
            element.position = GAME_CONFIG.position[j];
            element.cards = {bread: false, meat: false, salad: false, sauce: false};
            element.chance = '';
            element.win = false;
            j++;
        });
        player = playerList;

        // Utilisation des rooms socket.io. (id de la room unique(idGame) passée par l'url).
        io.of('/A'+idGame).on('connection', (socket) => {

            // Msg. signaler bien connecté.
            socket.on('fine', (callback) => {
                console.log('\x1b[36m%s\x1b[0m\x1b[41m%s\x1b[0m', '/////)> ','Game successfully connected to the server.');

                // Affiche la vue. (Cadre, nom, etc. qui n'est pas modifiable in game)
                io.of('/A'+idGame).to(socket.id).emit('view', player);

                callback({msg: 'Game successfully connected to the server.'})
            })

            // Si - de 2 joueurs (erreur de redirection ou autre, partie annulée).
            if (playerList.length < 2) {
                socket.emit('errorSocketIo', 410);
            }

            // Envoi liste de joueur à chaque connexion/modif.
            io.of('/A'+idGame).to(socket.id).emit('player', player);

            // Récup. socketId joueur.
            io.of('/A'+idGame).to(socket.id).emit('recupId', player);
            socket.on('idSocket', (id, newSocketId) => {
                playerList.forEach(element => {
                    if (element.id == id && element.socketId != newSocketId) {
                        element.socketId = newSocketId;
                        cptPlayer++;

                        if (cptPlayer === player.length) {
                            var num = Math.floor(Math.random() * Math.floor(player.length));

                            nextPlayer = num;
                            io.of('/A'+idGame).to(player[num].socketId).emit('play');
                        }
                    }
                })
            })


            function thimble(max){
                var nb = Math.floor(Math.random() * Math.floor(max)+1);
                console.log('Dé: ' +nb);
                return nb;
            }
            function win(num) {
                if (player[num].cards.bread === true && player[num].cards.meat === true && player[num].cards.salad === true && player[num].cards.sauce === true) {
                    if (player[num].bank >= BANKGOALS) {
                        console.log('win: true');
                        return true;
                    }else {
                        console.log('win: middle false');
                        return false;
                    }
                }else{
                    console.log('win: false');
                    return false;
                }
            }
            function endScreen(winner) {
                io.of('/A'+idGame).emit('endScreen', winner);
                usersCtrl.score(winner);
            }

            socket.on('goTurn', () => {
                play(nextPlayer);
            })

            function play(num) {
                var endOfTurn;
                // console.log(player.length);
                console.log(player[num].id +' | '+num);

                io.of('/A'+idGame).to(player[num].socketId).emit('yourTurn', true);

                socket.on('thimble', (ok) => {
                    console.log('Dé lancé: '+ ok);
                    var responseThimble = thimble(6);

                    io.of('/A'+idGame).emit('responseThimble', responseThimble, player[num]);

                    // Nouvelle position.
                    if (player[num].position + responseThimble <= BOARD) {
                        player[num].position = player[num].position + responseThimble;
                    }else {
                        var totalBoxes = player[num].position + responseThimble;
                        player[num].position = totalBoxes - BOARD;
                    }

                    // Savoir sur quelle case on est.

                    // Chance.
                    if (player[num].position === BOXES.chance[0] || player[num].position === BOXES.chance[1] || player[num].position === BOXES.chance[2] || player[num].position === BOXES.chance[3]) {
                        console.log('Chance');

                        // var randomChance = Math.floor(Math.random() * Math.floor(5));
                        var randomChance = 2;
                        var responseRandom;

                        switch (randomChance) {
                            case 0:
                                responseRandom = CHANCE.giveForEveryone[Math.floor(Math.random() * Math.floor(2))];

                                var info = player[num].username + ' donne '+ responseRandom + ' Coins à chaque joueur!';

                                io.of('/A'+idGame).emit('infos', info);

                                player.forEach(element => {
                                    element.coins += responseRandom;
                                })
                                player[num].coins -= responseRandom*player.length;

                                console.log(responseRandom*player.length);

                                endOfTurn();
                            break;
                            case 1:
                                responseRandom = CHANCE.giveForOne[Math.floor(Math.random() * Math.floor(2))];

                                console.log('giveForOne');

                                var textModal = 'À qui voulez-vous offrir ' + responseRandom + ' Coins?';

                                io.of('/A'+idGame).to(player[num].socketId).emit('modal_chance', player, textModal);

                                socket.on('choice_chance', (data) => {

                                    player[data].coins += responseRandom;
                                    player[num].coins -= responseRandom;

                                    io.of('/A'+idGame).emit('chance_giveForOne', player[num], player[data], responseRandom);

                                    endOfTurn();
                                })
                            break;
                            case 2:
                                responseRandom = CHANCE.getFromEveryone[Math.floor(Math.random() * Math.floor(2))];

                                var info = player[num].username + ' à volé '+ responseRandom + ' Coins à chaque joueur!';

                                io.of('/A'+idGame).emit('infos', info);

                                player.forEach(element => {
                                    element.coins -= responseRandom;
                                })
                                player[num].coins += responseRandom*player.length;

                                console.log(responseRandom*player.length);
                                endOfTurn();
                            break;
                            case 3:
                                responseRandom = CHANCE.getFromOne[Math.floor(Math.random() * Math.floor(2))];

                                console.log('getFromOne');

                                var textModal = 'À qui voulez-vous voler ' + responseRandom + ' Coins?';

                                io.of('/A'+idGame).to(player[num].socketId).emit('modal_chance', player, textModal);

                                socket.on('choice_chance', (data) => {

                                    player[data].coins -= responseRandom;
                                    player[num].coins += responseRandom;

                                    io.of('/A'+idGame).emit('chance_getFromOne', player[num], player[data], responseRandom);

                                    endOfTurn();
                                })
                            break;
                            case 4:
                                responseRandom = CHANCE.makeLoseOrWin[Math.floor(Math.random() * Math.floor(2))];

                                console.log('modal_makeLoseOrWin');

                                var textModal = 'Faire perdre '+ responseRandom +' Coins à tes \nadversaires ou les empocher?'

                                io.of('/A'+idGame).to(player[num].socketId).emit('makeLoseOrWin', textModal);

                                socket.on('lose-win', (data) => {
                                    if (data === 'lose') {
                                        player.forEach(element => {
                                            element.coins -= responseRandom;
                                        })
                                        player[num].coins += responseRandom;
                                    }else{
                                        player[num].coins += responseRandom;
                                    }

                                    endOfTurn();
                                })
                                // io.of('/A'+idGame).emit('anim_money', player[num].username, MONEY[randomPosition]);
                            break;
                            case 5:
                                io.of('/A'+idGame).to(player[num].socketId).emit('destroy', player, 0, 'Chance');

                                console.log('Destroy');

                                socket.on('destroyed', (data) => {

                                    console.log(data);

                                    if (data !== false) {
                                        var tab = data.split('-');

                                        player.forEach(element => {
                                            if (element.id == tab[1]) {
                                                switch (tab[0]) {
                                                    case 'bread':
                                                        element.cards.bread = false;
                                                        console.log(element);
                                                    break;
                                                    case 'meat':
                                                        element.cards.meat = false;
                                                        console.log(element);
                                                    break;
                                                    case 'salad':
                                                        element.cards.salad = false;
                                                        console.log(element);
                                                    break;
                                                    case 'sauce':
                                                        element.cards.sauce = false;
                                                        console.log(element);
                                                    break;
                                                    default:

                                                }
                                            }
                                        });
                                        console.log('Suppr '+tab[0]+' for '+tab[1]);

                                        endOfTurn();
                                    }else{
                                        endOfTurn();
                                    }
                                })
                            break;
                            default:
                                console.log('Erreur chance');
                                endOfTurn();
                        }
                        console.log('Here | '+responseRandom);


                    // Money.
                    }else if (player[num].position === BOXES.money[0] || player[num].position === BOXES.money[1] || player[num].position === BOXES.money[2] || player[num].position === BOXES.money[3]) {
                        console.log('Money');
                        var randomPosition = (Math.floor(Math.random() * MONEY.length));

                        if (randomPosition === null) {
                            randomPosition = 25;
                            console.log('bug money');
                        }
                        player[num].coins = player[num].coins + MONEY[randomPosition];

                        var info = player[num].username + ' a gagné ' + MONEY[randomPosition] + ' Coins';
                        io.of('/A'+idGame).emit('infos', info);

                        io.of('/A'+idGame).emit('anim_money', player[num].username, MONEY[randomPosition]);
                        endOfTurn();

                    // Resources.
                    }else if (player[num].position === BOXES.resources[0] || player[num].position === BOXES.resources[1] || player[num].position === BOXES.resources[2] || player[num].position === BOXES.resources[3]) {
                        console.log('Resources');

                        switch (player[num].position) {
                            case RESOURCES.bread:
                                if (player[num].cards.bread === false && player[num].coins >= RESOURCES_PRICE) {
                                    player[num].cards.bread = true;
                                    player[num].coins = player[num].coins - RESOURCES_PRICE;
                                }
                            break;

                            case RESOURCES.meat:
                                if (player[num].cards.meat === false && player[num].coins >= RESOURCES_PRICE) {
                                    player[num].cards.meat = true;
                                    player[num].coins = player[num].coins - RESOURCES_PRICE;
                                }
                            break;

                            case RESOURCES.salad:
                                if (player[num].cards.salad === false && player[num].coins >= RESOURCES_PRICE) {
                                    player[num].cards.salad = true;
                                    player[num].coins = player[num].coins - RESOURCES_PRICE;
                                }
                            break;

                            case RESOURCES.sauce:
                                if (player[num].cards.sauce === false && player[num].coins >= RESOURCES_PRICE) {
                                    player[num].cards.sauce = true;
                                    player[num].coins = player[num].coins - RESOURCES_PRICE;
                                }
                            break;
                        }
                        endOfTurn();

                    // Attack.
                    }else if (player[num].position === BOXES.attack[0] || player[num].position === BOXES.attack[1]) {
                        console.log('Attack');

                        var price = 40;

                        if (price <= player[num].coins) {
                            io.of('/A'+idGame).to(player[num].socketId).emit('destroy', player, price, 'Attaque');

                            socket.on('destroyed', (data) => {

                                if (data !== false) {
                                    var tab = data.split('-');

                                    player[num].coins -= price;
                                    player.forEach(element => {
                                        if (element.id == tab[1]) {
                                            switch (tab[0]) {
                                                case 'bread':
                                                    element.cards.bread = false;
                                                    console.log(element);
                                                break;
                                                case 'meat':
                                                    element.cards.meat = false;
                                                    console.log(element);
                                                break;
                                                case 'salad':
                                                    element.cards.salad = false;
                                                    console.log(element);
                                                break;
                                                case 'sauce':
                                                    element.cards.sauce = false;
                                                    console.log(element);
                                                break;
                                                default:

                                            }
                                        }
                                    });
                                    console.log('Suppr '+tab[0]+' for '+tab[1]);

                                    endOfTurn();
                                }else{
                                    endOfTurn();
                                }
                            })
                        }else{
                            io.of('/A'+idGame).to(player[num].socketId).emit('noMoney', 'attack', price);

                            endOfTurn();
                        }

                    // Bank.
                    }else if (player[num].position === BOXES.bank[0] || player[num].position === BOXES.bank[1]) {
                        console.log('bank');

                        if (player[num].coins > 0) {
                            io.of('/A'+idGame).to(player[num].socketId).emit('bank', {coins: player[num].coins});

                            socket.on('addToBank', (addToBank) => {
                                console.log('add: '+addToBank + ' Coins');
                                if (addToBank <= player[num].coins) {
                                    var nb = player[num].bank;
                                    player[num].bank = parseInt(addToBank) + nb;
                                    console.log('Bank: '+ player[num].bank);
                                    player[num].coins = player[num].coins - addToBank;
                                    endOfTurn();
                                }else {
                                    io.of('/A'+idGame).to(player[num].socketId).emit('noMoney', 'bank', addToBank);
                                    endOfTurn();
                                }
                            })

                        }else{
                            io.of('/A'+idGame).to(player[num].socketId).emit('noMoney', 'bank', 0);
                            endOfTurn();
                        }

                    // Benefits.
                    }else if (player[num].position === BOXES.benefit[0] || player[num].position === BOXES.benefit[1]) {
                        console.log('benefit');

                        player[num].coins = Math.floor(player[num].coins + (player[num].coins/100)*BENEFIT);

                        endOfTurn();

                    // Empty.
                    }else if (player[num].position === BOXES.empty[0] || player[num].position === BOXES.empty[1]) {
                        console.log('Nothing');
                        endOfTurn();
                    }

                    function endOfTurn() {

                        //  Éviter le négatif.
                        player.forEach(element => {
                            if (element.coins < 0) {
                                element.coins = 0;
                            }
                        })

                        player[num].win = win(num);
                        if (player[num].win === true) {
                            console.log('The winner is: '+player[num].username);

                            endScreen(player[num]);
                        }

                        io.of('/A'+idGame).to(player[num].socketId).emit('down');

                        if (num+1 == player.length) {
                            num = 0;

                        }else {
                            num++;
                        }

                        console.log('---------');

                        io.of('/A'+idGame).emit('player', player);

                        nextPlayer = num;
                        io.of('/A'+idGame).to(player[num].socketId).emit('play', num);
                    }

                })

            }


        }) // Fin connection.
    }
}
