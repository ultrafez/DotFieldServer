$(function() {
    var grid = new Grid(8, $('#gridContainer'));

    grid.bind('activate', function (coord) {
        console.log('activate', coord);
        if (!nyanMode) {
            console.log('activating');
            socket.emit('activate', coord);
        } else {
            console.log('nyanning');
            socket.emit('nyan', coord);
        }
    });

    grid.bind('deactivate', function (coord) {
        socket.emit('deactivate', coord);
    });

    var id = null;
    var colors = null;
    var startColorIndex = null;
    var endColorIndex = null;
    var myColor = null;

    // When nyan mode is on, touches are sent as nyan creation messages rather than standard activations
    var nyanMode = false;

    var socket = io.connect('http://' + config.listenIp + ":" + config.listenWebPort);
    socket.on('connect', function() {
        console.log('Connected to server');

        // If we have connected before (so we're reconnecting), id WON'T be null
        socket.emit('join', id);
    });

    socket.on('welcome', function (data) {
        console.log('Welcome received', data);

        if (data.app !== 'DotField') {
            alert('Connected to unknown server');
            return;
        }

        id = data.id;
        colors = data.colors;
        startColorIndex = data.startColorIndex;
        endColorIndex = data.endColorIndex;
        startColor = colors[startColorIndex];

        console.log('Allocated colour indexes ' + startColorIndex + ',' + endColorIndex + ' %cstart preview', 'color: ' + colorToCSS(startColor));

        socket.removeAllListeners('activate').on('activate', function (data) {
            console.log('color ' + data.color);
            grid.activateCell(data.coords.y, data.coords.x);
        });

        socket.removeAllListeners('deactivate').on('deactivate', function (data) {
            grid.deactivateCell(data.coords.y, data.coords.x);
        });

        // Create colour selector buttons
        $('#start-color-selector').empty();
        $('#end-color-selector').empty();

        for (var colorIndex=0; colorIndex < colors.length; colorIndex++) {
            var startButton = $('<button>');
            startButton.attr('data-colorindex', colorIndex)
            startButton.css('background-color', colorToCSS(colors[colorIndex]));
            startButton.addClass('color-select');
            startButton.addClass('start-color');

            if (colorIndex == startColorIndex) {
                startButton.addClass('selected');
            }

            $('#start-color-selector').append(startButton);

            var endButton = $('<button>');
            endButton.attr('data-colorindex', colorIndex)
            endButton.css('background-color', colorToCSS(colors[colorIndex]));
            endButton.addClass('color-select');
            endButton.addClass('end-color');

            if (colorIndex == endColorIndex) {
                endButton.addClass('selected');
            }

            $('#end-color-selector').append(endButton);
        }

        $('.face-select').prop('disabled', false);

        showSelectedFace(data.face);
    });

    socket.on('restart', function() {
        // The server is telling us that the server has restarted, so we should reload the page
        window.location.reload();
    });


    // Setup controls
    $('#controls').on('click', '.face-select', function() {
        var selectedFace = $(this).attr('data-face');
        socket.emit('faceselect', selectedFace);

        showSelectedFace(selectedFace);
    });

    var nyanActivationSequence = '2222111100006543';

    var nyanNextPosition = 0;
    $('#controls').on('click', '.color-select', function() {
        var selectedColor = parseInt($(this).attr('data-colorindex'), 10);
        var isStartColor = $(this).hasClass('start-color');

        var socketPayload = {
            isStartColor: isStartColor,
            colorIndex: selectedColor
        };
        socket.emit('colorselect', socketPayload);

        showSelectedColor(isStartColor, selectedColor);

        if (nyanActivationSequence[nyanNextPosition] == selectedColor) {
            nyanNextPosition++;
            if (nyanNextPosition == nyanActivationSequence.length) {
                showNyanModeSelector();
                nyanNextPosition = 0;
            }
        } else {
            nyanNextPosition = 0;
        }
    });

    $('#controls').on('click', '.nyan-select', function() {
        if ($(this).attr('data-nyan-mode') == 'on') {
            nyanMode = true;
        } else {
            nyanMode = false;
        }
    });

    if (document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled) {
        $('#enable-fullscreen').show();
    }

    $('#enable-fullscreen').on('click', function() {
        var i = document.getElementById('container');
 
        // go full-screen
        if (i.requestFullscreen) {
            i.requestFullscreen();
        } else if (i.webkitRequestFullscreen) {
            i.webkitRequestFullscreen();
        } else if (i.mozRequestFullScreen) {
            i.mozRequestFullScreen();
        } else if (i.msRequestFullscreen) {
            i.msRequestFullscreen();
        }
    });

    function showSelectedFace(face) {
        $('.face-select').removeClass('selected');
        $('.face-select[data-face=' + face + ']').addClass('selected');
    }

    function showSelectedColor(isStartColor, selectedColor) {
        var classPrefix = isStartColor ? 'start' : 'end';

        $('.' + classPrefix + '-color').removeClass('selected');
        $('.' + classPrefix + '-color[data-colorindex=' + selectedColor + ']').addClass('selected');
    }

    function showNyanModeSelector() {
        $('#nyan-mode-select').show();
    }

    function colorToCSS(colorArray) {
        return 'rgb(' + colorArray[0] + ', ' + colorArray[1] + ', ' + colorArray[2] + ')';
    }
});
