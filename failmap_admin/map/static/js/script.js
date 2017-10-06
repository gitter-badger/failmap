// Currently we're migrating to Vue.
// https://hackernoon.com/angular-vs-react-the-deal-breaker-7d76c04496bc
// also: reacts patent clause and mandatory jsx syntax ... NO


// support for week numbers in javascript
// https://stackoverflow.com/questions/7765767/show-week-number-with-javascript
Date.prototype.getWeek = function () {
    var onejan = new Date(this.getFullYear(), 0, 1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
};

// support for an intuitive timestamp
// translation?
Date.prototype.humanTimeStamp = function () {
    return this.getFullYear() + " Week " + this.getWeek();
};

// https://stackoverflow.com/questions/15762768/javascript-math-round-to-two-decimal-places
function roundTo(n, digits) {
    if (digits === undefined) {
        digits = 0;
    }

    var multiplicator = Math.pow(10, digits);
    n = parseFloat((n * multiplicator).toFixed(11));
    var test = (Math.round(n) / multiplicator);
    return +(test.toFixed(digits));
}

function debounce(func, wait, immediate) {
    var timeout;
    return function () {
        var context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        }, wait);
        if (immediate && !timeout) func.apply(context, args);
    };
}


var failmap = {
    map: null,
    geojson: "",
    metadata: L.control(),
    info: L.control(),
    legend: L.control({position: 'bottomright'}),

    initializemap: function () {
        this.map = L.map('map').setView([52.15, 5.8], 8);
        this.map.scrollWheelZoom.disable();

        L.control.fullscreen().addTo(this.map);
        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibXJmYWlsIiwiYSI6ImNqMHRlNXloczAwMWQyd3FxY3JkMnUxb3EifQ.9nJBaedxrry91O1d90wfuw', {
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
            '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="http://mapbox.com">Mapbox</a>',
            id: 'mapbox.light'
        }).addTo(this.map);

        this.map.attributionControl.addAttribution('Ratings &copy; <a href="http://faalkaart.nl/">Fail Map</a> <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>');

        this.metadata.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info');
            this.update();
            return this._div;
        };

        this.metadata.update = function (metadata) {
            this._div.innerHTML = '' + (metadata ?
                '<h4>' + new Date(metadata.data_from_time).humanTimeStamp() + '</h4>' : '<h4></h4>');
        };

        this.metadata.addTo(this.map);

        this.add_info();
        this.addlegend();
    },

    add_info: function () {
        this.info.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info');
            this.update();
            return this._div;
        };

        this.info.update = function (props) {
            var sometext = "";
            if (props) {
                sometext += "<h4>" + props.OrganizationName + "</h4>";
                if (props.Overall > 1)
                    sometext += '<b>Score: </b><span style="color: ' + failmap.getColor(props.Overall) + '">' + props.Overall + ' points</span>';
                else
                    sometext += '<b>Score: </b><span style="color: ' + failmap.getColor(props.Overall) + '">- points</span>';
                domainsDebounced(props.OrganizationID, $("#history")[0].value);
            } else {
                sometext += "<h4>-</h4>";
                sometext += '<b>Score: </b><span>- points</span>';
            }

            this._div.innerHTML = sometext;
        };

        this.info.addTo(this.map);
    },

    addlegend: function () {
        this.legend.onAdd = function (map) {

            var div = L.DomUtil.create('div', 'info legend'), labels = [];

            labels.push('<i style="background:' + failmap.getColor(199) + '"></i> Good');
            labels.push('<i style="background:' + failmap.getColor(999) + '"></i> Average');
            labels.push('<i style="background:' + failmap.getColor(1000) + '"></i> Bad');
            labels.push('<i style="background:' + failmap.getColor(-1) + '"></i> Unknown');

            div.innerHTML = labels.join('<br>');
            return div;
        };

        this.legend.addTo(this.map);
    },

    PointIcon: L.Icon.extend({
        options: {
            shadowUrl: '',
            iconSize: [16, 16],
            shadowSize: [0, 0],
            iconAnchor: [8, 8],
            shadowAnchor: [0, 0],
            popupAnchor: [-3, -76]
        }
    }),

    greenIcon: new L.Icon({iconUrl: 'static/images/green-dot.png'}),
    redIcon: new L.Icon({iconUrl: 'static/images/red-dot.png'}),
    orangeIcon: new L.Icon({iconUrl: 'static/images/orange-dot.png'}),
    grayIcon: new L.Icon({iconUrl: 'static/images/gray-dot.png'}),

    // get color depending on population density value
    getColor: function (d) {
        return d > 999 ? '#bd383c' :
            d > 199 ? '#fc9645' :
                d >= 0 ? '#62fe69' :
                    '#c1bcbb';
    },

    style: function (feature) {
        return {
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7,
            fillColor: failmap.getColor(feature.properties.Overall)
        };
    },

    pointToLayer: function (geoJsonPoint, latlng) {
        if (geoJsonPoint.properties.Overall > 999)
            return L.marker(latlng, {icon: failmap.redIcon});
        if (geoJsonPoint.properties.Overall > 199)
            return L.marker(latlng, {icon: failmap.orangeIcon});
        if (geoJsonPoint.properties.Overall > 0)
            return L.marker(latlng, {icon: failmap.greenIcon});
        return L.marker(latlng, {icon: failmap.grayIcon});
    },

    highlightFeature: function (e) {
        var layer = e.target;

        // doesn't work for points, only for polygons and lines
        if (typeof layer.setStyle === "function") {
            layer.setStyle({
                weight: 5,
                color: '#ccc',
                dashArray: '',
                fillOpacity: 0.7
            });
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                layer.bringToFront();
            }
        }
        failmap.info.update(layer.feature.properties);
    },

    onEachFeature: function (feature, layer) {
        layer.on({
            mouseover: failmap.highlightFeature,
            mouseout: failmap.resetHighlight,
            click: showreport
        });
    },

    resetHighlight: function (e) {
        failmap.geojson.resetStyle(e.target);
        failmap.info.update();
    },

    zoomToFeature: function (e) {
        this.map.fitBounds(e.target.getBounds());
    },

    gotoLink: function (e) {
        var layer = e.target;
        location.hash = "#" + layer.feature.properties['OrganizationName'];
    },


    loadmap: function (weeknumber) {
        $.getJSON('/data/map/' + weeknumber, function (json) {
            if (failmap.geojson) { // if there already was data present
                failmap.geojson.clearLayers(); // prevent overlapping polygons
                failmap.map.removeLayer(failmap.geojson);
            }

            failmap.geojson = L.geoJson(json, {
                style: failmap.style,
                pointToLayer: failmap.pointToLayer,
                onEachFeature: failmap.onEachFeature
            }).addTo(failmap.map); // only if singleton, its somewhat dirty.

            // todo: add the date info on the map, or somewhere.
            failmap.metadata.update(json.metadata);
        });
    }

};

failmap.initializemap();

var domainsDebounced = debounce(function (organization, weeks_back) {
    if (!weeks_back)
        weeks_back = 0;

    $.getJSON('/data/report/' + organization + '/' + weeks_back, function (data) {
        vueDomainlist.urls = data.calculation["organization"]["urls"];
    });
}, 100);

function loadtopfail(weeknumber) {
    $.getJSON('/data/topfail/' + weeknumber, function (data) {
        vueTopfail.top = data;
    });
}

function loadtopwin(weeknumber) {
    $.getJSON('/data/topwin/' + weeknumber, function (data) {
        vueTopwin.top = data;
    });
}

function loadstats(weeknumber) {
    $.getJSON('/data/stats/' + weeknumber, function (data) {
        vueStatistics.data = data;
    });
}

function loadterrible_urls(weeknumber) {
    $.getJSON('/data/terrible_urls/' + weeknumber, function (data) {
        vueTerribleurls.top = data;
    });
}


// reloads the map and the top fail every hour, so you don't need to manually refresh anymore
var hourly = false;

function update_hourly() {
    if (hourly) {
        failmap.loadmap(0);
        loadtopfail(0);
        loadtopwin(0);
        loadstats(0);
        $("#history").val(0);
    }
    hourly = true; // first time don't run the code, so nothing surprising happens
    setTimeout(update_hourly, 60 * 60 * 1000);
}


selected_organization = -1;

function showReportData(OrganizationID, weeks_ago) {
    selected_organization = OrganizationID;

    if (!weeks_ago) {
        weeks_ago = 0;
    }

    $.getJSON('/data/report/' + OrganizationID + '/' + weeks_ago, function (data) {
        vueReport.urls = data.calculation["organization"]["urls"];
        vueReport.points = data.rating;
        vueReport.when = data.when;
        vueReport.name = data.name;
    });
}

function jumptoreport() {
    location.hash = "#yolo"; // you can only jump once to an anchor, unless you use a dummy
    location.hash = "#report";
}

function showreport(e) {
    jumptoreport();
    var layer = e.target;
    showReportData(layer.feature.properties['OrganizationID'], $("#history")[0].value);
}


$(document).ready(function () {
    failmap.loadmap(0);

    // perhaps make it clear in the gui that it auto-updates? Who wants a stale map for an hour?
    // a stop/play doesn't work, as there is no immediate reaction, countdown perhaps? bar emptying?
    update_hourly();

    window.vueReport = new Vue({
        el: '#report',
        data: {
            calculation: '',
            rating: 0,
            when: 0,
            name: "",
            urls: Array
        },
        filters: {
            // you cannot run filters in rawHtml, so this doesn't work.
            // therefore we explicitly do this elsewhere
        },
        methods: {
            colorize: function (points) {
                if (points < 199) return "green";
                if (points < 400) return "orange";
                if (points > 399) return "red";
            },
            colorizebg: function (points) {
                if (points < 199) return "#dff9d7";
                if (points < 400) return "#ffefd3";
                if (points > 399) return "#fbeaea";
            },
            idize: function (url) {
                url = url.toLowerCase();
                return url.replace(/[^0-9a-z]/gi, '')
            },
            idizetag: function (url) {
                url = url.toLowerCase();
                return "#" + url.replace(/[^0-9a-z]/gi, '')
            },
            humanize: function (date) {
                return new Date(date).humanTimeStamp()
            },
            create_header: function(rating){
                keyz = Object.keys(rating);
                if (keyz[0] === "security_headers_strict_transport_security")
                    return "Strict Transport Security Header (HSTS)";
                if (keyz[0] === "tls_qualys")
                    return "Transport Layer Security (TLS)";
                if (keyz[0] === "http_plain")
                    return "Missing transport security (TLS)";
            },
            second_opinion_links: function(rating, url){
                keyz = Object.keys(rating);
                if (keyz[0] === "security_headers_strict_transport_security")
                    return '<a href="https://securityheaders.io/?q=' + url.url.url + '\" target=\"_blank\">Second Opinion (securityheaders.io)</a>';
                if (keyz[0] === "tls_qualys")
                    return '<a href="https://www.ssllabs.com/ssltest/analyze.html?d=' + url.url.url + '&hideResults=on&latest\" target=\"_blank\">Second Opinion (Qualys)</a>';
            },
            total_awarded_points: function(points) {
                if (points === "0")
                    marker = "✓ perfect";
                else
                    marker = points;
                return '<span class="total_awarded_points_'+ this.colorize(points) +'">' + marker + '</span>'
            },
            awarded_points: function(points) {
                if (points === "0")
                    marker = "✓ perfect";
                else
                    marker = points;
                return '<span class="awarded_points_'+ this.colorize(points) +'">+ ' + marker + '</span>'
            }
        }
    });

    window.vueStatistics = new Vue({
        el: '#statistics',
        data: {
            data: Array
        },
        computed: {
            greenpercentage: function () {
                return (!this.data.data) ? "0%" :
                    roundTo(this.data.data.now["green"] / this.data.data.now["total_organizations"] * 100, 2) + "%";
            },

            redpercentage: function () {
                return (!this.data.data) ? "0%" :
                    roundTo(this.data.data.now["red"] / this.data.data.now["total_organizations"] * 100, 2) + "%";
            },

            orangepercentage: function () {
                if (this.data.data) {
                    var score = 100 -
                        roundTo(this.data.data.now["no_rating"] / this.data.data.now["total_organizations"] * 100, 2) -
                        roundTo(this.data.data.now["red"] / this.data.data.now["total_organizations"] * 100, 2) -
                        roundTo(this.data.data.now["green"] / this.data.data.now["total_organizations"] * 100, 2);
                    return roundTo(score, 2) + "%";
                }
                return 0
            },

            unknownpercentage: function () {
                return (!this.data.data) ? "0%" :
                    roundTo(this.data.data.now["no_rating"] / this.data.data.now["total_organizations"] * 100, 2) + "%";
            }
        }
    });

    window.vueDomainlist = new Vue({
        el: '#domainlist',
        data: {urls: Array},
        methods: {
            colorize: function (points) {
                if (points < 199) return "green";
                if (points < 400) return "orange";
                if (points > 399) return "red";
            }
        }
    });

    window.vueTopfail = new Vue({
        el: '#topfail',
        data: {top: Array},
        methods: {
            showReport: function (OrganizationID) {
                jumptoreport();
                showReportData(OrganizationID, $("#history")[0].value);
                domainsDebounced(OrganizationID, $("#history")[0].value);
            },
            humanize: function (date) {
                return new Date(date).humanTimeStamp()
            }
        }
    });

    window.vueTopwin = new Vue({
        el: '#topwin',
        data: {top: Array},
        methods: {
            showReport: function (OrganizationID) {
                jumptoreport();
                showReportData(OrganizationID, $("#history")[0].value);
                domainsDebounced(OrganizationID, $("#history")[0].value);
            },
            humanize: function (date) {
                return new Date(date).humanTimeStamp()
            }
        }
    });

    window.vueTerribleurls = new Vue({
        el: '#terrible_urls',
        data: {top: Array},
        methods: {
            showReport: function (OrganizationID) {
                jumptoreport();
                showReportData(OrganizationID, $("#history")[0].value);
                domainsDebounced(OrganizationID, $("#history")[0].value);
            },
            humanize: function (date) {
                return new Date(date).humanTimeStamp()
            }
        }
    });

    window.vueHistory = new Vue({
        el: '#historycontrol',
        data: {
            weeksback: 0

        },
        computed: {
            visibleweek: function () {
                x = new Date();
                x.setDate(x.getDate() - this.weeksback * 7);
                return x.humanTimeStamp();
            }
        }
    });

    // move space and time ;)
    $("#history").on("change input", debounce(function () {
        failmap.loadmap(this.value);
        loadtopfail(this.value);
        loadtopwin(this.value);
        loadterrible_urls(this.value);

        if (selected_organization > -1) {
            showReportData(selected_organization, this.value);
            domainsDebounced(selected_organization, this.value);
        }

        loadstats(this.value); // todo: cache
        vueHistory.weeksback = this.value;
    }, 200));

    loadtopwin(0);
    loadtopfail(0);
    loadstats(0);
    loadterrible_urls(0);
});
