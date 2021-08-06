// Name: Spencer Boat
// Date: 5/8/19
// Section: CSE 154 AN
//
// This is the JavaScript file for pokedex.html. It fetches required data from the API, Displays
// the pokedex, and displays the currently selected pokemo and all its info. It makes the game work
// by making calls to the server with a move selected by the user. It updates the display to
// reflect the current game state.

(function() {
  "use strict";


  const DEX_URL = "https://courses.cs.washington.edu/courses/cse154/webservices/pokedex/pokedex.php";
  const IMG_URL = "https://courses.cs.washington.edu/courses/cse154/webservices/pokedex/";
  const GAME_URL = "https://courses.cs.washington.edu/courses/cse154/webservices/pokedex/game.php";
  let guid = "";
  let pid = "";
  let baseHP = "";

  window.addEventListener("load", init);

  /**
   * Called when page is loaded. Calls function to make a request for the pokedex.
   */
  function init() {
    requestPokedex();
    id("start-btn").addEventListener("click", startGame);
    id("endgame").addEventListener("click", showMain);
    id("flee-btn").addEventListener("click", function(e) {
      gamePlay(e, "flee");
    });
  }

  /**
   * Makes a request of the API for the pokedex.
   */
  function requestPokedex() {
    let url = DEX_URL + "?pokedex=all";
    fetch(url)
      .then(checkStatus)
      .then(buildDex)
      .catch(console.error);
  }

  /**
   * Builds the pokedex with the initial pokemon set to found
   * @param {string} responseData - a string of all the pokemon in the format Full name:shortname
   */
  function buildDex(responseData) {
    let spriteURL = "https://courses.cs.washington.edu/courses/cse154/webservices/pokedex/sprites/";
    let pokedex = responseData.split(/[\n:]/);
    for(let i = 1; i < pokedex.length; i+=2) {
      let img = document.createElement("img");
      img.classList.add("sprite");
      img.src = spriteURL + pokedex[i] + ".png";
      img.alt = pokedex[i-1];
      img.id = pokedex[i];
      if(pokedex[i] === "bulbasaur" || pokedex[i] === "charmander" || pokedex[i] === "squirtle") {
        img = found(img);
      }
      id("pokedex-view").appendChild(img);
    }
  }

  /**
   * Gives the given pokemon the .found class and makes it clickable by the user.
   * @param {object} pokemon - the pokemon to be marked as found
   * @returns {object} the pokemon object given, now clickable and with the .found class
   */
  function found(pokemon) {
    pokemon.classList.add("found");
    pokemon.addEventListener("click", function() {
      let eyeD = pokemon.id;
      getInfo(eyeD, "p1");
    });
    return pokemon;
  }

  /**
   * fetches the info for the selected pokemon
   * @param {string} eyeD - ID of the pokemon to get the info of
   * @param {string} player - the player that will have control of this pokemon in battle
   */
  function getInfo(eyeD, player) {
    let url = DEX_URL + "?pokemon=" + eyeD;
    fetch(url)
      .then(checkStatus)
      .then(JSON.parse)
      .then(function(e) {
        showInfo(e, eyeD, player);
      })
      .catch(console.error);
  }

  /**
   * Displays all the info of the selected pokemon in the designated player card.
   * @param {object} responseData - JSON object of user-selected pokemon.
   * @param {string} eyeD - ID of the pokemon to show the info of
   * @param {string} player - the player that will have control of this pokemon in battle
   */
  function showInfo(responseData, eyeD, player) {
    id(player).querySelector(".name").innerText = responseData.name;
    id(player).querySelector(".card").id = eyeD;
    id(player).querySelector(".pokepic").src = IMG_URL + responseData.images.photo;
    id(player).querySelector(".type").src = IMG_URL + responseData.images.typeIcon;
    id(player).querySelector(".weakness").src = IMG_URL + responseData.images.weaknessIcon;
    id(player).querySelector(".hp").innerText = responseData.hp + "HP";
    id(player).querySelector(".info").innerText = responseData.info.description;
    let moves = responseData.moves;
    let moveSlots = id(player).querySelector(".moves").querySelectorAll("button");
    if(moves.length < moveSlots.length) {
      for(let i = moves.length; i < moveSlots.length; i++)  {
        moveSlots[i].classList.add("hidden");
      }
    }
    for(let i = 0; i < moves.length; i++) {
      moveSlots[i].classList.remove("hidden");
      moveSlots[i].querySelector(".move").innerText = moves[i].name;
      if(moves[i].dp) {
        moveSlots[i].querySelector(".dp").innerText = moves[i].dp + " DP";
      } else {
        moveSlots[i].querySelector(".dp").innerText = "";
      }
      moveSlots[i].querySelector("img").src = IMG_URL + "icons/" + moves[i].type + ".jpg";
    }
    if(player === "p1") {
      id("start-btn").classList.remove("hidden");
    }
  }

  /**
   * Starts the game. Makes a call to the server to start the game. Displays the starting game
   * state. Makes the game buttons interactable.
   */
  function startGame() {
    baseHP = id("p1").querySelector(".hp").innerText;
    let params = new FormData();
    params.append("startgame", "true");
    params.append("mypokemon", id("p1").querySelector(".card").id);
    fetch(GAME_URL, {method: "POST", body: params})
      .then(checkStatus)
      .then(JSON.parse)
      .then(function(e) {
        guid = e.guid;
        pid = e.pid;
        updateVar(e);
        getInfo(e.p2.shortname,"p2");
        let moves = id("p1").querySelector(".moves").querySelectorAll("button");
        for(let i = 0; i < moves.length; i++) {
          let move = moves[i].querySelector(".move").innerText;
          moves[i].addEventListener("click", function() {
            gamePlay(e, move);
          });
          moves[i].disabled = false;
        }
      })
      .catch(console.error);
    id("pokedex-view").classList.add("hidden");
    id("start-btn").classList.add("hidden");
    id("p2").classList.remove("hidden");
    let bar = qsa(".health-bar");
    for(let i = 0; i < bar.length; i++) {
      bar[i].classList.remove("low-health");
      bar[i].style.width = "100%";
    }
    showAll(".hp-info");
    id("results-container").classList.remove("hidden");
    id("flee-btn").classList.remove("hidden");
    qs("h1").innerText = "Pokemon Battle Mode!";
    showAll(".buffs");
  }

  /**
   * Called when the player selects a move. Fetches updated game info from the server.
   * @param {object} e - the event object from the user clicking a move button
   * @param {string} move - the name of the move that was clicked
   */
  function gamePlay(e, move) {
    id("loading").classList.remove("hidden");
    let params = new FormData();
    params.append("guid", guid);
    params.append("pid", pid);
    move = move.replace(/\s+/g,"");
    move = move.toLowerCase();
    params.append("movename", move);
    fetch(GAME_URL, {method: "POST", body: params})
      .then(checkStatus)
      .then(JSON.parse)
      .then(function(data) {
        updateGame(data);
      })
      .catch(console.error);
  }

  /**
   * Called when the player selects a move. Fetches updated game info from the server.
   * @param {object} data - the JSON object returned from calling it from the user selecting a move
   */
  function updateGame(data) {
      id("loading").classList.add("hidden");
      results(data);
      healthUpdate(data);
      let buff = qsa(".buffs");
      for(let i = 0; i < buff.length; i++) {
        buff[i].innerHTML = "";
      }
      applyBuff(data);
      updateVar(data);
  }

  /**
   * Updates the results conatiner with the results returned from the server
   * @param {object} e - the JSON object returned from the server
   */
  function results(e) {
    id("p1-turn-results").classList.remove("hidden");
    id("p1-turn-results").innerText = "Player 1 played " + e.results["p1-move"] + " and "
                                      + e.results["p1-result"] + "!";
    if(e.results["p2-move"]) {
      id("p2-turn-results").classList.remove("hidden");
      id("p2-turn-results").innerText = "Player 2 played " + e.results["p2-move"] + " and "
                                        + e.results["p2-result"] + "!";
    } else {
      id("p2-turn-results").classList.add("hidden");
    }
  }

  /**
   * Updates the health of the pokemon based on the results returned from the server
   * @param {object} e - the JSON object returned from the server
   */
  function healthUpdate(e) {
    let array = ["p2", "p1"];
    for(let i = 0; i < array.length; i++) {
      let player = array[i];
      let currentHP = e[player]["current-hp"];
      let hp = e[player].hp;
      let divide = currentHP / hp;
      let bar = id(player).querySelector(".health-bar");
      bar.style.width = (divide * 100) + "%";
      if(divide <= .2) {
        bar.classList.add("low-health");
      } else {
        bar.classList.remove("low-health");
      }
      id(player).querySelector(".hp").innerText = currentHP + "HP";
      if(currentHP <= 0) {
        if(player === "p2") {
          qs("h1").innerText = "You won!";
          endGame(true);
        } else {
          qs("h1").innerText = "You lost!";
          endGame(false);
        }
      }
    }
  }

  /**
   * Updates the buffs and debuffs based on the results returned from the server
   * @param {object} e - the JSON object returned from the server
   */
  function applyBuff(e) {
    let p1Buff = e.p1.buffs;
    let p1Debuff = e.p1.debuffs;
    let p2Buff = e.p2.buffs;
    let p2Debuff = e.p2.debuffs;
    makeBuff(p1Buff, true, "p1");
    makeBuff(p1Debuff, false, "p1");
    makeBuff(p2Buff, true, "p2");
    makeBuff(p2Debuff, false, "p2");
    showAll(".buffs");
  }

  /**
   * Updates the health of the pokemon based on the results returned from the server
   * @param {array} buffList - the list of buffs or debuffs applied to the pokemon
   * @param {boolean} buff - true if a buff, false if a debuff.
   * @param {string} player - string of which player pokemon the buff is to be applied to
   */
  function makeBuff(buffList, buff, player) {
    for(let i = 0; i < buffList.length; i++) {
      let arrow = document.createElement("div");
      if(buff) {
        arrow.classList.add("buff");
      } else {
        arrow.classList.add("debuff");
      }
      if(buffList[i] === "attack") {
        arrow.classList.add("attack");
      } else if(buffList[i] === "defense") {
        arrow.classList.add("defense");
      } else if(buffList[i] === "accuracy") {
        arrow.classList.add("accuracy");
      }
      id(player).querySelector(".buffs").appendChild(arrow);
    }
  }

  /**
   * Updates display for the end game. Disables move buttons. Makes return to pokedex button
   * visible.
   * @param {boolean} won - true if the user won, false if the user lost
   */
  function endGame(won) {
    id("flee-btn").classList.add("hidden");
    let move = id("p1").querySelector(".moves").children;
    for(let i = 0; i < move.length; i++) {
      move[i].disabled = true;
      let newMove = move[i].cloneNode(true);
      move[i].parentNode.replaceChild(newMove, move[i]);
    }
    id("endgame").classList.remove("hidden");
    let pokeID = id("p2").querySelector(".card").id;
    if(won && !(pokeByID(pokeID).classList.contains("found"))) {
      let newPoke = pokeByID(pokeID);
      found(newPoke);
    }
  }

  /**
   * Hides the game display and shows the pokedex display. Clears existing buffs and results.
   */
  function showMain() {
    id("endgame").classList.add("hidden");
    id("p1-turn-results").innerText = "";
    id("p2-turn-results").innerText = "";
    id("p1").querySelector(".buffs").classList.add("hidden");
    let buffCont = qsa(".buffs");
    for(let i = 0; i < buffCont.length; i++) {
      buffCont[i].innerHTML = "";
    }
    id("results-container").classList.add("hidden");
    id("p2").classList.add("hidden");
    id("start-btn").classList.remove("hidden");
    id("p1").querySelector(".hp-info").classList.add("hidden");
    id("p1").querySelector(".hp").innerText = baseHP;
    qs("h1").innerText = "Your Pokedex";
    id("pokedex-view").classList.remove("hidden");

  }

  /**
   * returns the object of a pokemon when given the ID
   * @param {array} pokeID - id of the pokemon in the pokedex
   * @return {object} - the object of the pokemon in the pokedex
   */
  function pokeByID(pokeID) {
    let pokedex = id("pokedex-view").children;
    for(let i = 0; i < pokedex.length; i++) {
      if(pokedex[i].id === pokeID) {
        return pokedex[i];
      }
    }
    return null;
  }

  /**
   * Shows all instances of a given selector
   * @param {string} selector - the selector to be shown
   */
  function showAll(selector) {
    let array = qsa(selector);
    for(let i = 0; i < array.length; i++) {
      array[i].classList.remove("hidden");
    }
  }

  /**
   * Updates module-global variables for the returns from the server
   * @param {object} e - results returned from the server.
   */
  function updateVar(e) {
    guid = e.guid;
    pid = e.pid;
  }

  /**
   * Returns the element that has the ID attribute with the specified value.
   * @param {string} idName - element ID
   * @returns {object} DOM object associated with id.
   */
  function id(idName) {
    return document.getElementById(idName);
  }

  /**
   * Returns the first element that matches the given CSS selector.
   * @param {string} query - CSS query selector.
   * @returns {object} The first DOM object matching the query.
   */
  function qs(query) {
    return document.querySelector(query);
  }

  /**
   * Returns the array of elements that match the given CSS selector.
   * @param {string} selector - CSS query selector
   * @returns {object[]} array of DOM objects matching the query.
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }



  /**
   * Helper function to return the response's result text if successful, otherwise
   * returns the rejected Promise result with an error status and corresponding text
   * @param {object} response - response to check for success/error
   * @returns {object} - valid result text if response was successful, otherwise rejected
   *                     Promise result
   */
  function checkStatus(response) {
    if (response.status >= 200 && response.status < 300 || response.status === 0) {
      return response.text();
    } else {
      return Promise.reject(new Error(response.status + ": " + response.statusText));
    }
  }

})();
