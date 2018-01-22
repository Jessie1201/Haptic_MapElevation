/*
	This is the main part of this interaction technique to change the pointer moving speed according to the slop.
*/

/* request elevation via google API */

function initMap() {
    var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: {lat: 63.203, lng: -150.4},  // Denali.
        mapTypeId: 'terrain'
    });
    var elevator = new google.maps.ElevationService;
    // if need info label, enable the following
    //    var infowindow = new google.maps.InfoWindow({map: map});

    // temporarily disable the click function
    //    map.addListener('click', function(event) {
    //        displayLocationElevation(event.latLng, elevator, infowindow);
    //    });
}

function displayLocationElevation(location, elevator, infowindow) {
    // Initiate the location request
    elevator.getElevationForLocations({
        'locations': [location]
    }, function(results, status) {
        infowindow.setPosition(location);
        if (status === 'OK') {
            // Retrieve the first result
            if (results[0]) {
                // Open the infowindow indicating the elevation at the clicked position.
                infowindow.setContent('The elevation at this point <br>is ' +
                                      results[0].elevation + ' meters.');
            } else {
                infowindow.setContent('No results found');
            }
        } else {
            infowindow.setContent('Elevation service failed due to: ' + status);
        }
    });
}


// switch the label
//function switcher() {
//    document.getElementsByClassName("label").style.opacity = "0";
//}
//$('.switch').click(function() {
//    $('.label').css({
//        opacity:0;
//    });
//});
function myFunction()
{
    document.getElementsByClassName('label').setAttribute("class", "style1");
}


/* configure the fake cursor */
/* modified from https://github.com/javierbyte/control-user-cursor/blob/master/index.js */

// config

const kAssets = {
    mac_retina: {
        normal: {
            src: 'assets/mac_retina.png',
            height: '22px',
            width: '15px'
        },
    },
    mac: {
        normal: {
            src: 'assets/mac.png',
            width: '15px',
            height: '22px'
        },
    },
    other: {
        normal: {
            src: 'assets/other.png',
            width: '17px',
            height: '23px'
        },
    }
};

function getCursor() {
    let navigator = window.navigator.platform.indexOf('Mac') > -1 ? 'mac' : 'win';

    if (window.devicePixelRatio > 1) {
        navigator += '_retina';
    }

    if (Object.keys(kAssets).includes(navigator)) {
        return kAssets[navigator];
    }

    return kAssets.other;
}

function setCursor(cursorConfig) {
    C.el.src = cursorConfig.src;
    C.el.style.width = cursorConfig.width;
    C.el.style.height = cursorConfig.height;
}

// global
window.C = {};

C.containerEl = document.querySelector('#container');
C.el = document.createElement('img');
C.el.id = 'cursor';

C.cursorConfig = getCursor();
setCursor(C.cursorConfig.normal);

document.body.appendChild(C.el);

C.elToTrack = {};
C.elToTrackKeys = Object.keys(C.elToTrack);

C.isMouseVisible = false;

function ControlUserCursor(config, createElements) {
    const elConfig = config.el;

    C.expoWeight = config.expoWeight || 2;

    if (createElements) {
        C.containerEl.innerHTML = '';
    }

    C.elToTrack = elConfig;

    C.elToTrackKeys = Object.keys(C.elToTrack);
    C.elToTrackKeys.map(key => {
        if (elConfig[key].el === undefined) {
            C.elToTrack[key].el = document.createElement('div');
            C.elToTrack[key].el.className = elConfig[key].className.join(' ');
            C.elToTrack[key].el.innerHTML = elConfig[key].innerHTML;
        }
        C.elToTrack[key]._hover = false;

        if (createElements) {
            C.containerEl.appendChild(C.elToTrack[key].el);
        }
    });

    onUpdateElementSizes();
}

// UTILS
function getPolarity(num) {
    return num >= 0 ? 1 : -1;
}

function getDiff(obj1, obj2) {
    const diffX = obj1.x - obj2.x;
    const diffY = obj1.y - obj2.y;
    return Math.sqrt(diffX * diffX + diffY * diffY);
}

// does the math, using the elToTrack config object
function calculateNewCursor(newCursor) {
    const calculatedCursor = {
        x: newCursor.x,
        y: newCursor.y
    };

    C.elToTrackKeys.map(key => {
        const objSize = C.elToTrack[key]._size;
        const objCenter = C.elToTrack[key]._center;
        const objBehavior = C.elToTrack[key].behavior;

        const diff = getDiff(objCenter, newCursor);

        const importance = Math.pow(1 - Math.min(1, Math.max(diff / C.wZ, 0)), C.expoWeight);

        if (importance < 0.001) {
            return newCursor;
        }

        let xyDiff;

        xyDiff = {
            x: objCenter.x - (objCenter.x * importance + newCursor.x * (1 - importance)),
            y: objCenter.y - (objCenter.y * importance + newCursor.y * (1 - importance))
        }
        if(objBehavior === 'MOUNTAIN'){
            calculatedCursor.x = calculatedCursor.x - newCursor.x + (objCenter.x - xyDiff.x);
            calculatedCursor.y = calculatedCursor.y - newCursor.y + (objCenter.y - xyDiff.y);
        }else if (objBehavior === 'VALLEY'){
            calculatedCursor.x = calculatedCursor.x + newCursor.x - (objCenter.x - xyDiff.x);
            calculatedCursor.y = calculatedCursor.y + newCursor.y - (objCenter.y - xyDiff.y);
        }
    });

    return {
        x: Math.round(calculatedCursor.x),
        y: Math.round(calculatedCursor.y)
    };
}

// iterate over the elements to see if we need to hover anyone
function calculateHover(newCursor) {
    C.elToTrackKeys.map(key => {
        const trackedObj = C.elToTrack[key];

        if (trackedObj.behavior !== 'VALLEY') {
            return;
        }

        const calculatedDiff = getDiff(trackedObj._center, newCursor);

        const isHovering = calculatedDiff < trackedObj._size / 2;

        setCursor(C.cursorConfig.normal);

        trackedObj._hover = false;
        trackedObj.el.classList.remove('-hover');
    });
}

// remove the fake cursor when the user moves the real out of the window
function onMouseOut() {
    window.requestAnimationFrame(() => {
        C.el.style.opacity = 0;
        C.isMouseVisible = false;
    });
}

// main function that calculates the fake cursor position
function onMouseMove(evt) {
    window.requestAnimationFrame(() => {
        if (C.isMouseVisible === false) {
            C.el.style.opacity = 1;
            C.isMouseVisible = true;
        }

        const calculatedCursor = calculateNewCursor({
            x: evt.clientX,
            y: evt.clientY
        });

        calculateHover(calculatedCursor);

        C.el.style.transform =
            'translatex(' + calculatedCursor.x + 'px) translatey(' + calculatedCursor.y + 'px)';
    });
}


function onUpdateElementSizes() {
    window.requestAnimationFrame(() => {
        // update the window size values
        C.wX = window.innerWidth;
        C.wY = window.innerHeight;
        C.wZ = Math.min(C.wX, C.wY) / 2;

        // iterate over all the elements that we are tracking, and update the clientRect value
        C.elToTrackKeys.map(key => {
            const clientRect = C.elToTrack[key].el.getBoundingClientRect();

            // update element internal vals
            C.elToTrack[key]._clientRect = clientRect;
            C.elToTrack[key]._center = {
                x: clientRect.left + clientRect.width / 2,
                y: clientRect.top + clientRect.height / 2
            };
            C.elToTrack[key]._size = Math.max(clientRect.width, clientRect.height);
        });
    });
}

window.addEventListener('resize', onUpdateElementSizes);
window.addEventListener('mouseout', onMouseOut);
window.addEventListener('contextmenu', event => event.preventDefault());


// initialize sizes

const kConfig = {
    basic: {
        el: {
            buttonToMountain1: {
                behavior: 'MOUNTAIN',
                innerHTML: 'Mountain',
                className: ['label', '-mountain', '-alt1']
            },
            buttonToMountain2: {
                behavior: 'MOUNTAIN',
                innerHTML: 'Mountain',
                className: ['label', '-mountain', '-alt3']
            },
            buttonToMountain3: {
                behavior: 'MOUNTAIN',
                innerHTML: 'Mountain',
                className: ['label', '-mountain', '-alt5']
            },
            buttonToMountain4: {
                behavior: 'MOUNTAIN',
                innerHTML: 'Mountain',
                className: ['label', '-mountain', '-alt7']
            },
            buttonToMountain5: {
                behavior: 'MOUNTAIN',
                innerHTML: 'Mountain',
                className: ['label', '-mountain', '-alt9']
            },
            buttonToMountain6: {
                behavior: 'MOUNTAIN',
                innerHTML: 'Mountain',
                className: ['label', '-mountain', '-alt11']
            },
            buttonToValley1: {
                behavior: 'VALLEY',
                innerHTML: 'Valley',
                className: ['label', '-valley', '-alt2']
            },
            buttonToValley2: {
                behavior: 'VALLEY',
                innerHTML: 'Valley',
                className: ['label', '-valley', '-alt4']
            },
            buttonToValley3: {
                behavior: 'VALLEY',
                innerHTML: 'Valley',
                className: ['label', '-valley', '-alt6']
            },
            buttonToValley4: {
                behavior: 'VALLEY',
                innerHTML: 'Valley',
                className: ['label', '-valley', '-alt8']
            },
        },
        expoWeight: 2
    }
};

ControlUserCursor(kConfig.basic, true);
window.addEventListener('mousemove', onMouseMove);
