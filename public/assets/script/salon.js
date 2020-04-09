$( document ).ready(function() {


    // Fetch des données du profil.

    fetch('../api/users/me/', {
        method: 'get'
    })
    .then(res => res.json())
    .then(function(profile){
        profile = profile;
        console.log(profile);

        if (profile["error"]) {
            alert('ERREUUUUUUUUUR!')
        }else {
            $('#player').replaceWith('<div id="player" class="player"><p class="player-pseudo">'+ profile["username"] +'</p><p class="player-score">Partie(s) gagnée(s): '+ profile["score"]+'</p></div>');
            profile = null;
        }

    })
    .catch(err => { console.log(err) });
});
