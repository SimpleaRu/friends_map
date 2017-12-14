var surnames;
var photos;
var name;

function vkApi(method, options) {
    if (!options.v) {
        options.v = '5.68';
    }

    return new Promise((resolve, reject) => {
        VK.api(method, options, data => {
            if (data.error) {
                reject(new Error(data.error.error_msg));
            } else {
                resolve(data.response);
            }
        });
    });
}

function vkInit() {
    return new Promise((resolve, reject) => {
        VK.init({
            apiId: 6198589 // local host
            // 6296958 Simplea.ru
        });

        VK.Auth.login(data => {
            if (data.session) {
                resolve();
            } else {
                reject(new Error('Не удалось авторизоваться'));
            }
        }, 2);
    });
}

function geocode(address) {
    return ymaps.geocode(address).then(result => {
        const points = result.geoObjects.toArray();

        if (points.length) {
            return points[0].geometry.getCoordinates();
        }
    });
}

let myMap;
let clusterer;

new Promise(resolve => ymaps.ready(resolve))
    .then(() => vkInit())
    .then(() => vkApi('friends.get', { fields: 'city,country, first_name, last_name, photo_100' }))
    .then(friends => {
        myMap = new ymaps.Map('map', {
            center: [55.76, 37.64], // Москва
            zoom: 5
        }, {
                searchControlProvider: 'yandex#search'
            });
        clusterer = new ymaps.Clusterer({
            preset: 'islands#invertedVioletClusterIcons',
            clusterDisableClickZoom: true,
            openBalloonOnClick: true
        });

        myMap.geoObjects.add(clusterer);

        return friends.items;
    })
    .then(friends => {
        const promises = friends    // координаты
            .filter(friend => friend.country && friend.country.title)
            .map(friend => {
                let parts = friend.country.title;
                if (friend.city) {
                    parts += ' ' + friend.city.title;
                }
                return parts;
            })
            .map(string => geocode(string));

        surnames = friends.map(function (itm) {
            if (itm.city || itm.country) {
                return itm.last_name;
            }
        }).filter(function (exist) {
            return exist;
        });

        name = friends.map(function (itm) {
            if (itm.city || itm.country) {
                return itm.first_name;
            }
        }).filter(function (exist) {
            return exist;
        });

        photos = friends.map(function (itm) {
            if (itm.city || itm.country) {
                return itm.photo_100;
            }
        }).filter(function (exist) {
            return exist;
        });

        return Promise.all(promises);
    })
    .then(function (coords) {

        const placemarks = coords.map(function (coord, i) {
            return new ymaps.Placemark(coord, {
                balloonContentHeader: name[i],
                balloonContentBody: `<img src='${photos[i]}'>`,
                balloonContentFooter: name[i] + ' ' + surnames[i]
            }, { preset: 'islands#blueHomeCircleIcon' })
        });

        clusterer.add(placemarks);
    })
    .catch(e => alert('Ошибка: ' + e.message));
