const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const canvas = createCanvas(1000, 1000);
const ctx = canvas.getContext("2d");
const { races, width, height, description, baseImageUri, editionSize, startEditionFrom, endEditionAt, raceWeights } = require("./input/config.js");

var metadataList = [];
var attributesList = [];
var dnaList = [];

const saveImage = (_edition) => {
    fs.writeFileSync(`./output/${_edition}.png`, canvas.toBuffer("image/png"));
};


// -------------------- Styling and Display ------------------------ // 
const signImage = (_sig) => {
    ctx.fillStyle = "#000000"
    ctx.font = "bold 30pt Courier";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(_sig, 40, 40)
};

/**
 * 
 * @returns Generates a random pastel color
 */
const genColor = () => {
    let hue = Math.floor(Math.random() * 360);
    let pastel = `hsl(${hue}, 100%, 85%)`;
    return pastel
}

/**
 * Draws a background to the Image
 */
const drawBackground = () => {
    ctx.fillStyle = genColor();
    ctx.fillRect(0,0, width, height);
}


// -------------------- Metadata Display ------------------------ // 
const addMetadata = (_dna, _edition) => {
    let dateTime = Date.now();
    let tempMetadata = {
        dna: _dna.join(""),
        name: `#${_edition}`,
        description: description,
        image: `${baseImageUri}/${_edition}`,
        edition: _edition,
        date: dateTime,
        attributes: attributesList
    };

    metadataList.push(tempMetadata);
    attributesList = [];
}

const addAttributes = (_element) => {
    let selectedElement = _element.layer.selectedElement;
    attributesList.push({
        trait_type: _element.layer.name,
        value: selectedElement.name
    })
}

const writeMetaData = (_data) => {
    fs.writeFileSync("./output/_metadata.json", _data);
};


// -------------------- Construct and Load Layers ------------------------ //

const loadLayerImg = async (_layer) => {
    return new Promise(async (resolve) => {
        const image = await loadImage(`${_layer.selectedElement.path}`);
        resolve({ layer: _layer, loadedImage: image });
    })
};

const drawElement = (_element) => {
    ctx.drawImage(
        _element.loadedImage,
        _element.layer.position.x,
        _element.layer.position.y,
        _element.layer.size.width,
        _element.layer.size.height
    );

    addAttributes(_element);
};


// -------------------- DNA Creation and Handling ------------------------ //

const construcLayerToDna = (_dna = [], _races = [], _race) => {
    let mappedDnaToLayers = _races[_race].layers.map((layer, index) => {
        let selectedElement = layer.elements.find(e => e.id == _dna[index]);
        return {
            name: layer.name,
            position: layer.position,
            size: layer.size,
            selectedElement: selectedElement
        }
    });
    return mappedDnaToLayers;
};

const getRace = (_editionCount) => {
    let race = "No Race";
    
    raceWeights.forEach(raceWeight => {
        if(_editionCount >= raceWeight.from && _editionCount <= raceWeight.to){
            race = raceWeight.value;
        }
    });
    return race
}


const isDnaUnique = (_dnaList = [], _dna = []) => {
    let foundDna = _dnaList.find((i) => i.join("") === _dna.join("") );
    return foundDna == undefined ? true : false;
};


const createDna = (_races, _race) => {
    let randNum = [];
    _races[_race].layers.forEach((layer) => {
        let randElementNum = Math.floor(Math.random() * 100);
        let num = 0;
        layer.elements.forEach(element => {
            if(randElementNum >= 100 - element.weight){
                num = element.id;
            }
        });
        randNum.push(num);
    });
    return randNum;
}


// -------------------- Generate Art ------------------------ //

const startCreating = async () => {
    writeMetaData("");
    let editionCount = startEditionFrom;
    while (editionCount <= endEditionAt) {
        let race = getRace(editionCount);
        let newDna = createDna(races, race);
        if (isDnaUnique(dnaList, newDna)) {
            let results = construcLayerToDna(newDna, races, race);
            let loadedElements = []; // promise array
            results.forEach(layer => {
                loadedElements.push(loadLayerImg(layer));
            });
            await Promise.all(loadedElements).then(elementArray => {
                ctx.clearRect(0, 0, width, height);
                drawBackground();
                elementArray.forEach(element => {
                    drawElement(element)
                });
                signImage(`#${editionCount}`);
                saveImage(editionCount);
                addMetadata(newDna, editionCount);
                console.log(`Created edition: ${editionCount} with DNA ${newDna} and race ${race}`);
            });
            dnaList.push(newDna);
            editionCount++;
        } else {
            console.error("DNA Already Exists");
        }
    }
    writeMetaData(JSON.stringify(metadataList));
}

startCreating();
