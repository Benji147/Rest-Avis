
class Restaurant {
    constructor(id,name,position,address,comments,rating) {
        this.id = id;
        this.name = name;
        this.position = position;
        this.address = address;
        this.comments = comments;
        this.rating = rating;
    }
}

class Carte {
    constructor() {
        this.restos = [];
        this.restosFiltres = [];
        this.restosAjoutes = [];
        this.commentRestoPlace = [];
        this.markers = [];
        this.bds;
        this.noteMin = $("#minNote").val();
        this.noteMax = $("#maxNote").val();
        this.map = new google.maps.Map(document.getElementById('map'), {
            zoom: 12
        });
        this.infoResto = new google.maps.InfoWindow();
        this.geocoder = new google.maps.Geocoder;
        this.init();
    }

    //Cette fonction va surveiller les notes//
    listenerNote() {
        const vm = this;
        $("#minNote").on('change', () => {
            vm.noteMin = $("#minNote").val();
            vm.filtreResto(vm.noteMin,vm.noteMax);
            vm.drawRestos(vm.restosFiltres);
        });
        $("#maxNote").on('change', () => {
            vm.noteMax = $("#maxNote").val();
            vm.filtreResto(vm.noteMin,vm.noteMax);
            vm.drawRestos(vm.restosFiltres);
        });       
    }

    //Cette fonction va surveiller les changements de zone géographique affichés//
    listenerBounds() {
        const vm = this;
        vm.map.addListener('idle', async () => {
            vm.bds = vm.map.getBounds();
            await vm.rechercheRestosGP(vm.bds) 
            vm.filtreResto(vm.noteMin,vm.noteMax);
            vm.drawRestos(vm.restosFiltres);
        });
    }

    //Fct externe de création de marker personnalisé//
    setEventMarker(marker, infoWindow, texte, photo) {
        const ensemble = texte + photo;
        google.maps.event.addListener(marker, 'click', function() {
            infoWindow.setContent(ensemble);
            infoWindow.open(this.map, this);
        });
    }

    //Recup les notes et commentaires des restos//
    recupData(element) {
        const vm = this;
        let nomResto = vm.normalisationString(element.name);
        if (element.id === null || element.id.length < 10) {
            return new Promise((resolve) => {
                let adressResto = element.address;
                $(`#listeAvis${nomResto}`).append(`<div class="data_resto">ADRESSE : ${adressResto}</div></br>`);
                let commentsResto = [];
                if (element.comments !== undefined) {
                    element.comments.forEach(function(e) {
                        let starsResto = e.stars;
                        let commentResto = e.comment;
                        $(`#listeAvis${nomResto}`).append(`<div class="data_resto">${starsResto} : ${commentResto}</div></br>`);
                    });
                }
                vm.commentRestoPlace.forEach(function(comment) {
                    if (element.id === comment.id) {
                        for( let i = 0; i < comment.comments.length; i++) {
                            $(`#listeAvis${nomResto}`).append(`<div class="data_resto">${comment.comments[i].stars} : ${comment.comments[i].comment}</div>`);
                        }
                    }
                });
                resolve();
            });
        } else {
            let request = {
                placeId: element.id,
                fields: ['review', 'formatted_address']
            };
            return new Promise((resolve,reject) => {
                vm.service.getDetails(request, function(results, status) {
                    if (status == google.maps.places.PlacesServiceStatus.OK) {
                        if (results !== undefined) {
                            let adressResto = results.formatted_address;
                            $(`#listeAvis${nomResto}`).append(`<div class="data_resto">ADRESSE : ${adressResto}</div></br>`);
                            let commentsResto = [];
                            if (results.reviews !== undefined) {
                                results.reviews.forEach(function(e) {
                                    let starsResto = e.rating;
                                    let commentResto = e.text;
                                    $(`#listeAvis${nomResto}`).append(`<div class="data_resto">${starsResto} : ${commentResto}</div></br>`);
                                });
                            }
                            vm.commentRestoPlace.forEach(function(comment) {
                                if (element.id === comment.id) {
                                    for( let i = 0; i < comment.comments.length; i++) {
                                        $(`#listeAvis${nomResto}`).append(`<div class="data_resto">${comment.comments[i].stars} : ${comment.comments[i].comment}</div>`);
                                    }
                                }
                            });
                            resolve();
                        }
                    } else {
                        reject(results);
                    }
                });
            });
        } 

    }

    //Cette fonction va créer la map et l'afficher//
    initMap() {
        const vm = this;
        let myPosition;
        let defaultPosition;
        navigator.geolocation.getCurrentPosition(function (pos) {
            let coord = pos.coords;
            myPosition =  {
                lat: coord.latitude,
                lng: coord.longitude
            }; 
            vm.map.setCenter(myPosition);
            let marker = new google.maps.Marker({
                position: myPosition,
                icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    fillColor: 'black',
                    fillOpacity: 0.3,
                    scale: 5,
                    strokeColor: 'blue',
                    strokeWeight: 1,
                    zIndex: 1
                },
                draggable: true
            });
            marker.setMap(vm.map);
        }, function (err) {
            defaultPosition =  {
                lat: 48.866667,
                lng: 2.333333
            }; 
            vm.map.setCenter(defaultPosition);
            let marker = new google.maps.Marker({
                position: defaultPosition,
                icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    fillColor: 'black',
                    fillOpacity: 0.3,
                    scale: 5,
                    strokeColor: 'blue',
                    strokeWeight: 1,
                    zIndex: 1
                },
                draggable: true
            });
            marker.setMap(vm.map);
        });

    }

    //Cette fonction va récupérer les restos du fichier JSON et les sauvegarder dans this.restos////
    addRestoData() {
        const vm = this;
        $.get( "data.json", function(resto) {
            for (let i = 0; i < resto.length; i++) {
                let latResto = resto[i].lat;
                let lngResto = resto[i].long;
                let posResto = {latResto, lngResto};
                let moy = (resto[i].ratings[0].stars+resto[i].ratings[1].stars)/2;
                vm.restos.push(new Restaurant(String(i),resto[i].restaurantName,posResto,resto[i].address,resto[i].ratings,moy));
            }
        });
    }

    //Cette fonction va récupérer les restos ajoutés manuellement sur la carte et les sauvegarder dans this.restos//
    addRestoAjoutes() {
        const vm = this;
        if (vm.restosAjoutes.length !== 0) {
            for(let i = 0; i < vm.restosAjoutes.length; i++) {
                vm.restos.push(vm.restosAjoutes[i]);
            }
        }
    }

    boutonAfficherDetails(element) {
        const vm = this;
        let nomResto = vm.normalisationString(element.name);
        $(`#btnVoirAvis${nomResto}`).click(async function() {
            $(`#avis${nomResto}`).show('slow');
            $(`#btnCacherAvis${nomResto}`).show();
            $(`#btnVoirAvis${nomResto}`).hide();
            await vm.recupData(element);
        });
    }

    boutonCacherDetails(element) {
        const vm = this;
        let nomResto = vm.normalisationString(element.name);
        $(`#btnCacherAvis${nomResto}`).click(function() {
            $(`#btnVoirAvis${nomResto}`).show();
            $(`#btnCacherAvis${nomResto}`).hide();
            $(`#avis${nomResto}`).hide();
            $(`#listeAvis${nomResto}`).empty();
        });
    }

    boutonAjouterAvis(element) {
        const vm = this;
        let nomResto = vm.normalisationString(element.name);
        $(`#btnAjoutAvis${nomResto}`).one('click', function() {
            vm.ajouterUnAvis(element);
        });
    }

    boutonAjouterResto(element) {
        const vm = this;
        $("#ajoutResto").one('click', function() {
            vm.ajouterRestoDB();
            let nom = $("#nameResto").val();
            let moy = $("#starResto").val();
            let noteMoy = `<div> ${nom} <br> Note moyenne : ${moy} </div><br>`;
            let photo = `<img src="https://maps.googleapis.com/maps/api/streetview?size=100x100&location=${element.lat},${element.lng}&key=AIzaSyDVYlpJGNplPM900JX1YXNDWHiMehTmHDA">`;
            let markersRestos = new google.maps.Marker({
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: 'blue',
                    fillOpacity: 0.3,
                    scale: 20,
                    strokeColor: 'blue',
                    strokeWeight: 1,
                    zIndex: 1
                },
                draggable: false
            });
            markersRestos.setPosition(element);
            markersRestos.setMap(vm.map);
            vm.markers.push(markersRestos);
            vm.setEventMarker(markersRestos, vm.infoResto, noteMoy, photo);
            $("#panel").hide();
            $("#nameResto").val(null);
            $("#starResto").val(null);
            $("#commentResto").val(null);
        });
    }

    boutonAnnulerAjoutResto() {
        const vm = this;
        $("#annulerAjoutResto").click(function() {
            $("#nameResto").val(null);
            $("#starResto").val(null);
            $("#commentResto").val(null);
            $("#panel").hide();
        });
    }

    //Cette fonction va supprimer les espaces, les caractéres spéciaux et mettre en miniscule une chaine de caractéres données//
    normalisationString(element) {
        if (element !== undefined) {
            element = element.replace(/ /g, "");
            element = element.replace(/[^a-zA-Z0-9_-]/g,'')
            element = element.toLowerCase();
            return element;
        } else {alert("Attention la chaine de caractère est undefined");}
    }

    //Cette fonction va afficher les infos des restaurants dans la liste de droite//
    detailRestos(element) {
        const vm = this;
        let noteMoy = element.rating;
        let nomResto = vm.normalisationString(element.name);
        $(".restaurant").append(`<div id="${nomResto}" class="adress_img_resto"></div>`);
        $(`#${nomResto}`).append(`<h3>${element.name}</h3>`,`<img src="https://maps.googleapis.com/maps/api/streetview?size=100x100&location=${element.position.latResto},${element.position.lngResto}&key=AIzaSyAoMRAr72uNyjREiQRxabLKkokp0rpDUno"><br>`,`<span id="noteMoy${nomResto}">Note moyenne : ${element.rating}</span><br>`,`<button id="btnVoirAvis${nomResto}" class="voirDetails" type="button">Voir les détails</button><br>`,`<button id="btnCacherAvis${nomResto}" class="cacherDetails" type="button">Cacher les détails</button><br>`);
        $(`#btnCacherAvis${nomResto}`).hide();
        $(`#${nomResto}`).append(`<div id="avis${nomResto}" class="avisResto"></div>`);
        $(`#avis${nomResto}`).append(`<div id="listeAvis${nomResto}" class="listeAvis"></div>`);
        $(`#avis${nomResto}`).append(`<label for="note">Donner une note entre 0 et 5 :</label><input type="number" id="note${nomResto}" min="0" max="5"><br><label for="commentaire">Commentaire</label><input type="text" id="commentaire${nomResto}"><br>`, `<button id="btnAjoutAvis${nomResto}" class="ajoutFormAvis"  type="button">Ajouter votre avis</button><br>`).hide();
    }

    saveComment(element,comment) {
        const vm = this;
        let idElement = element.id;
        let newComment = {id: idElement, comments: [comment]};
        vm.commentRestoPlace.push(newComment);
    }

    ajouterUnAvis(element) {
        const vm = this;
        let nomElement = vm.normalisationString(element.name);
        let star = $(`#note${nomElement}`).val();
        let comment = $(`#commentaire${nomElement}`).val();
        let commentAdd = {stars : parseInt(`${star}`), comment: `${comment}`};
        let newComment = element.comments;
        newComment.push(commentAdd);
        $(`#listeAvis${nomElement}`).append(`<div class="data_resto">${star} : ${comment}</div>`);
        $(`#note${nomElement}`).val("");
        $(`#commentaire${nomElement}`).val("");
        let noteMoy = element.rating;
        $(`#noteMoy${nomElement}`).html(`Note moyenne : ${noteMoy}`);
        if (element.id !== null) {
            vm.saveComment(element,commentAdd);
        }
        this.clearMarkersResto();
        this.drawRestos(vm.restosFiltres);
    }

    //Cette fonction va afficher sur le côté la liste des restos affichés sur la carte//
    listeRestos() {
        const vm = this;
        $("#listeResto").empty();
        $("#listeResto").append('<div class="restaurant"></div>');
        for (let i = 0; i < vm.restosFiltres.length; i++) {
            vm.detailRestos(vm.restosFiltres[i]);
            vm.boutonAfficherDetails(vm.restosFiltres[i]);
            vm.boutonCacherDetails(vm.restosFiltres[i]);
            vm.boutonAjouterAvis(vm.restosFiltres[i]);
        }
    }

    //Cette fonction va effacer les markers de la carte//
    clearMarkersResto() {
        this.markers.forEach(m => m.setMap(null));
        this.markers.splice(0);
    }

    //Cette fonction va placer un marker sur les restos affichés sur la carte//
    drawRestos(resto) {
        const vm = this;
        vm.clearMarkersResto();
        if (resto !== undefined) {
            for (let j = 0; j < resto.length; j++) {
                let latRestos = resto[j].position.latResto;
                let lngRestos = resto[j].position.lngResto;
                let positionRestos = {lat: latRestos, lng: lngRestos};
                let noteMoy = `<div> ${resto[j].name} <br> Note moyenne : ${resto[j].rating} </div><br>`;
                let photo = `<img src="https://maps.googleapis.com/maps/api/streetview?size=100x100&location=${latRestos},${lngRestos}&key=AIzaSyAoMRAr72uNyjREiQRxabLKkokp0rpDUno">`;
                let markersRests = new google.maps.Marker({
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: 'blue',
                        fillOpacity: 0.3,
                        scale: 20,
                        strokeColor: 'blue',
                        strokeWeight: 1,
                        zIndex: 1
                    },
                    draggable: false
                });
                markersRests.setPosition(positionRestos);
                markersRests.setMap(vm.map);
                vm.markers.push(markersRests);
                vm.setEventMarker(markersRests, vm.infoResto, noteMoy, photo);
            }
        }
    }

    //Cette fonction va filtrer les restos suivant les notes et suivant la zone geographique affichée//
    filtreResto(min,max) {
        const vm = this;
        vm.restosFiltres.splice(0);
        vm.restosFiltres = vm.restos.filter(resto => {
            const moy = resto.rating;
            return moy >= min && moy <= max;
        }).filter(resto => {
            if (vm.bds !== null) {
                return vm.bds.contains(new google.maps.LatLng(resto.position.latResto,resto.position.lngResto));
            }
            return true; 
        });
        vm.listeRestos();
    } 

    formulaireAjoutResto(adresse,position) {
        const vm  = this;
        $("#panel").show();
        $("#adresseResto").val(adresse);
        $("#coordResto").val(`${position.lat} , ${position.lng}`);
        vm.boutonAnnulerAjoutResto();
        vm.boutonAjouterResto(position);
    }

    //Fonction qui va surveiller le click droit sur la carte
    ajoutRestoMap() {
        const vm  = this;
        let map = this.map;
        map.addListener('rightclick', function(e) {    
            vm.geocoder.geocode({'location' : e.latLng}, function(results, status) {
                let adresseResto = results[0].formatted_address;
                let positionResto = {lat : Number(e.latLng.lat().toFixed(6)), lng : Number(e.latLng.lng().toFixed(6))};
                vm.formulaireAjoutResto(adresseResto,positionResto);
            })
        });
    }

    //Fonction qui va sauvegarder un resto ajouter manuellement dans restosAjoutes//
    ajouterRestoDB() {
        let nomResto = $("#nameResto").val();
        let adresseResto = $("#adresseResto").val();
        let coordResto = $("#coordResto").val();
        let coords = coordResto.split(",");
        let positionResto = {latResto: parseFloat(coords[0]), lngResto: parseFloat(coords[1])};
        let starResto = Number($("#starResto").val());
        let commentResto = $("#commentResto").val();
        let commentsResto = [{stars: starResto, comment: commentResto}];
        this.restosAjoutes.push(new Restaurant(null,nomResto,positionResto,adresseResto,commentsResto,starResto));
    }

    fetchDetailsForPlace(place) {
        const vm = this;
        return new Promise((resolve) => {
            let placeIdResto = place.place_id;
            let nomResto = place.name;
            let positionResto = {latResto: place.geometry.location.lat(), lngResto: place.geometry.location.lng()};
            let commentsResto = [];
            commentsResto.push({stars: null, comment: null});
            let ratingResto = place.rating
            resolve(new Restaurant(placeIdResto,nomResto,positionResto,null,commentsResto,ratingResto));
        })
    }

    //Fonction qui applique la méthode précédente à tous les restos trouvés par Google Place
    async fetchDetailsForPlaces(places) {
        const vm = this;
        places = places.splice(0,19);
        const promises = places.map(place => vm.fetchDetailsForPlace(place));
        try {
            return await Promise.all(promises);
        } catch (e) {
            return [];
        }
    }

    //Cette fonction va intégrer tous les restaurants GP de la zonne géographique affichée//
    rechercheRestosGP(position) {
        const vm = this;
        vm.restos.splice(0);
        let request = {
            bounds: position,
            type: ['restaurant'],
        };
        vm.service = new google.maps.places.PlacesService(vm.map);
        return new Promise(resolve => {
            vm.service.nearbySearch(request, async function(places, status) {
                if (status == google.maps.places.PlacesServiceStatus.OK) {
                    vm.addRestoData();
                    vm.addRestoAjoutes();
                    const result = await vm.fetchDetailsForPlaces(places);
                    vm.restos.push(...result);
                    resolve(vm.restos);
                }
            });
        });
    }  


    init() {
        this.initMap();
        this.listenerBounds();
        this.listenerNote();
        this.ajoutRestoMap();
    }
}

const carte = new Carte();
google.maps.event.addDomListener(window, 'load', carte);




