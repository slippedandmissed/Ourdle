const socket = io();
let rows;
let currentRow;
let hadNewWord = false;

$(document).ready(() => {
    $(document.body).keypress((event) => {
        if ($(event.target).closest('#controls').length) {
            return;
        }
        const key = event.key.toUpperCase()
        if (key.length === 1 && "A" <= key && key <= "Z") {
            rows[currentRow].addLetter(key);
        }
    });

    $(document.body).keyup((event) => {
        if ($(event.target).closest('#controls').length) {
            return;
        }
        if (event.keyCode == 8) { // Backspace
            rows[currentRow].removeLetter();
        }
        else if (event.keyCode == 13) {
            rows[currentRow].submit();
        }
    });

    $("#keys .keyRow:not(:last-of-type) div").click(function() {
        rows[currentRow].addLetter($(this).text());
    }).each(function() {
        $(this).attr("data-letter", $(this).text());
    });

    $("#backspace").click(function() {
        rows[currentRow].removeLetter();
    });

    $("#enter").click(function() {
        rows[currentRow].submit();
    });

    $("#overlay").click(() => {
        closeOverlay();
    })

    $("#newWord").submit(function (event) {
        const word = $(this).find("input").val();
        socket.emit("newWord", word);
        $(this).find("input").val("");
        event.preventDefault();
    });

    $("#newRandomWord").click(() => {
        socket.emit("newRandomWord");
    })
});

const setUpGrid = () => {
    $("#grid").empty();
    $("#keys .keyRow div").removeClass("green").removeClass("yellow").removeClass("grey");
    rows = [new Row()];
    currentRow = 0;
}


socket.on("connect", () => {
    console.log("Connected to socket");
});

socket.on("validation", (types, i, str) => {
    let won = true;
    for (let i=0; i<str.length; i++) {
        const elt = $(`div[data-letter='${str[i]}']`);
        if (!elt.hasClass("green")) {
            elt.removeClass("yellow");
            elt.addClass(types[i]);
        }
    }
    for (const t of types) {
        if (t !== "green") {
            won = false;
            break;
        }
    }
    $("#grid .row").eq(i).find(".box").each(function (index) {
        $(this).addClass(types[index]).text(str[index]);
    });
    if (won) {
        $("#overlay #win").removeClass("hidden");
        $("#overlay #win #guessCount").text(currentRow + 1);
        openOverlay();
        return;
    }
    currentRow++;
    rows.push(new Row());
});

socket.on("invalid", () => {
    $("#overlay #invalidWord").removeClass("hidden");
    setTimeout(() => {
        closeOverlay();
    }, 1000);
    openOverlay();
rows[currentRow].clear();
});

socket.on("newWord", () => {
    if (hadNewWord) {
        $("#overlay #newWord").removeClass("hidden");
        setTimeout(() => {
            closeOverlay();
        }, 1000);
        openOverlay();
    }
    $(":focus").blur();
    hadNewWord = true;
    setUpGrid();
});

socket.on("invalidNewWord", () => {
    $("#overlay #invalidWord").removeClass("hidden");
    setTimeout(() => {
        closeOverlay();
    }, 1000);
    openOverlay();
})

class Row {

    chars = [];

    constructor() {
        this.elt = $("<div class='row'>");
        for (let i = 0; i < CONFIG.letterCount; i++) {
            this.elt.append($("<div class='box'>"));
        }
        this.elt.removeClass("hidden");
        $("#grid").append(this.elt);
    }

    addLetter(letter) {
        if (this.chars.length >= CONFIG.letterCount) {
            return;
        }
        this.elt.find(".box").eq(this.chars.length).text(letter);
        this.chars.push(letter);
    }

    removeLetter() {
        if (this.chars.length === 0) {
            return 0;
        }
        this.chars.pop();
        this.elt.find(".box").eq(this.chars.length).text("");
    }

    clear() {
        this.chars = [];
        this.elt.find(".box").text("");
    }

    submit() {
        if (this.chars.length === CONFIG.letterCount) {
            socket.emit("validate", this.chars, currentRow);
        }
    }
}

const closeOverlay = () => {
    $("#overlay").addClass("overlay-hidden");
    setTimeout(() => {
        $("#overlay #overlayContent > *").addClass("hidden");
    }, 500);
}


const openOverlay = () => {
    $("#overlay").removeClass("overlay-hidden");
}