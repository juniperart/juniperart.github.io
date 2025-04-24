let board
let legend
let dimensions = [12, 12]
let tiles
let lightIndex = 0
let lights
let pallette
let activeSwatch
let activeTileArr = []
let cells
let cellWidth
let togglePreviewButton
let toggleLabelButton
let toggleBorderButton
let clearButton
let sortButton
let sortIndex = 1
let saveButton
let savedSelect
let swatchKeys = []
let swatchKeys1 = []

function clearActiveTiles() {
    console.log('clear!')

    activeTileArr = []
    changeLight(lightIndex)
    console.log('clearactive', lightIndex) 
}

function setActiveTile(x) {
    const index = x.target.dataset.index - 1
    const tile = tiles[index]

    if ( tile && tile.ele ) tile.ele.style.border = '4px solid gold'
    activeTileArr.push(tile)
}

function clickSetActiveTile(x) {
    let isDuplicate = false
    const tileIndex = x.target.dataset.index

    for ( let i = activeTileArr.length - 1; i >= 0; i-- ) {
        if ( activeTileArr[i]?.ele.dataset.index === tileIndex ) {
            isDuplicate = true
            activeTileArr[i].ele.style.border = ''
            activeTileArr.splice(i, 1)
        }
    }
    if (isDuplicate) return
    setActiveTile(x)
}

function buildTileArray(savedTiles) {
    tiles = cells.map((x, i) => {
        const xCoord = i % dimensions[0] + 1
        const yCoord = Math.floor( i / dimensions[0]) + 1
        return {
            position: [xCoord, yCoord],
            type: savedTiles ? savedTiles[i].type : 'White',
            ele: x,
            index: i,
        }
    })
    
    cells.forEach((x) => {
        x.addEventListener('click', clickSetActiveTile.bind(x))
        x.addEventListener('dragover', setActiveTile.bind(x));
        x.addEventListener('ondrag', setActiveTile.bind(x));
    })
}

function togglePreview() {
    document.body.classList.toggle('hidePreview')
}

function toggleLabel() {
    document.body.classList.toggle('hideLabel')
}

function toggleBorder() {
    document.body.classList.toggle('hideBorder')
}

function saveBoardState() {
    const saveState = {
        title: '',
        dimensions: dimensions,
        tiles: tiles,
    }
    console.log(saveState)
}

function activateButtons() {
    togglePreviewButton.addEventListener('click', togglePreview)
    toggleLabelButton.addEventListener('click', toggleLabel)
    toggleBorderButton.addEventListener('click', toggleBorder)
    clearButton.addEventListener('click', clearActiveTiles)
    sortButton.addEventListener('click', sortSwatches)
    saveButton.addEventListener('click', saveBoardState)
}

function setRows() {
    console.log('setrows')
    const height = board.offsetHeight - 4
    const rows = Array.from(document.querySelectorAll('.row'))
    cells = Array.from(document.querySelectorAll('.cell'))
    const cellHeight = `${height / dimensions[1]}px`
    cellWidth = `${height / dimensions[0]}px`
    console.log('cellwidth is', cellWidth)
    
    rows.forEach(row => {
        row.style.height = cellHeight
    })
    cells.forEach(cell => {
        cell.style.width = cellWidth
    })
}

function buildLegend() {
    let legendHtml = ''
    lightHexes.forEach((x, i) => {
        legendHtml += `
            <div data-index="${i}" 
                style="background-color: ${x[1]}; border-color: ${i === 0 ? 'gold' : 'lightgray'}" 
                onclick="changeLight(${i})" class="light${i === lightHexes.length - 1 ? ' last' : ''}"
            >
            </div>
        `
    })
    legendHtml += '<div id="togglePreviewButton" class="toggle-button"><div></div></div>'
    legendHtml += '<div id="toggleLabelButton" class="toggle-button"><span>#</span></div>'
    legendHtml += '<div id="toggleBorderButton" class="toggle-button"><hr /><hr /></div>'
    legendHtml += '<div id="clearButton" class="toggle-button"><span>X</span></div>'
    legendHtml += '<div id="sortButton" class="toggle-button"><span> Sort</span></div>'
    legend.innerHTML = legendHtml
    lights = Array.from(document.querySelectorAll('.light'))
    togglePreviewButton = document.getElementById('togglePreviewButton')
    toggleLabelButton = document.getElementById('toggleLabelButton')
    toggleBorderButton = document.getElementById('toggleBorderButton')
    clearButton = document.getElementById('clearButton')
    clearButton = document.getElementById('clearButton')
    clearButton = document.getElementById('clearButton')
    sortButton = document.getElementById('sortButton')
}

function selectSwatch(ele) {
    console.log(ele)
    const type = ele?.target.dataset.type
    const paper = paperArray.find(x => x.name === type)
    console.log(paper)
    activeTileArr.forEach((x) => {
        const activeIndex = x?.index
        const styleStr = `background-color: ${hexes[paper.appearance[lightIndex]]}; width: ${cellWidth}`
        x.ele.style = styleStr
        console.log(styleStr)
     //   x.ele.querySelector('span').innerHTML = `${type.substring(1)}-${type[0]}`
        tiles[activeIndex].type = type
    })
    console.log(activeTileArr)
    activeTileArr = [] 
}

function activatePanel() {
    const swatchRows = Array.from(document.querySelectorAll('.swatch-row'))
    swatchRows.forEach((x) => {
        x.addEventListener('click', selectSwatch.bind(x))
    })
}

function makeSwatchKeys() {
    const whiteSwatches = paperArray
    const redSwatches = [...whiteSwatches].sort((a, b) => a.appearance[1].localeCompare(b.appearance[1]));
    const blueSwatches = [...whiteSwatches].sort((a, b) => a.appearance[2].localeCompare(b.appearance[2]));
    const greenSwatches = [...whiteSwatches].sort((a, b) => a.appearance[3].localeCompare(b.appearance[3]));

    swatchKeys1 = [whiteSwatches, redSwatches, blueSwatches, greenSwatches]
    console.log(swatchKeys1)
}

function getBackground(x, i) {
    return `background-color: ${hexes[x.appearance[i]]};`
}

function buildPanel() {
    let swatchesHtml = ''
    pallette.innerHTML = ''
    
    swatchKeys1[sortIndex].forEach(x => {
        const name = x.name
        const swatch = `
            <div class="swatch-row" data-type="${name}">
                <div class="swatchLabel">${name}</div>
                <div style="${getBackground(x, 0)}"></div>
                <div style="${getBackground(x, 1)}"></div>
                <div style="${getBackground(x, 2)}"></div>
                <div style="${getBackground(x, 3)}"></div>
            </div>
        `
        swatchesHtml += swatch
     })
    
    pallette.innerHTML += swatchesHtml

    activatePanel()
}


function sortSwatches() {
    sortIndex++
    if (sortIndex === 3) sortIndex = 0
    buildPanel()
}

function buildCells(row) {
    let str = ''

    for (let i = 0; i < dimensions[0]; i++) {
        str += `
            <div class="cell" data-index="${row * dimensions[0] + (i + 1)}">
                <span></span>
                <div class="preview"></div>
            </div>`
    }
    return str
}

function drawGrid() {
    let str = ''
    for (let i = 0; i < dimensions[1]; i++) {
        str += `
            <div class="row">
                ${buildCells(i)}
            </div>
        `
    }
    board.innerHTML = str
}

const nextIndex = (i, arr) => {
    return i === arr.length - 1 ? 0 : i + 1
}

function changeLight(i) {
    console.log('changeLight')
    lightIndex = i
    let previewIndex = i === 0 ? 0 : (i === 1 ? 2 : 1)
    console.log('preview')
    console.log(cellWidth)

    lights.forEach((x, i) => {
        x.style.borderColor = i === lightIndex ? 'gold' : 'lightgray'
    })
    console.log(tiles)
    tiles.forEach(x => {
        const type = x.type
        const paper = paperArray.find(x => x.name === type)
        const preview = x.ele.querySelector('.preview')
        x.ele.querySelector('span').innerHTML = x.type
        x.ele.style = `background-color: ${hexes[paper.appearance[lightIndex]]}; width: ${cellWidth}`
        preview.style = `background-color: ${hexes[paper.appearance[previewIndex]]}`
        preview.style.opacity = i === 0 ? 0 : 1
    })
}

function buildSavedSelect() {
    let saveOptions = ''
    saves.forEach((x, i) => {
        let save = saves[i]
        saveOptions += `
            <option value="${i}">${save.title} - ${save.dimensions[0]} x ${save.dimensions[1]}</option>
        `
    })
    savedSelect.innerHTML = saveOptions
    savedSelect.addEventListener('change', (e) => {
        setSaved(e)
    })
}

function setSaved(e) {
    console.log('setsaved')
    const saveState = saves[savedSelect.value]
    dimensions = saveState.dimensions
    drawGrid()
    setRows()
    buildTileArray(saveState.tiles)
    changeLight(lightIndex)
}

function init() {
    console.log('init')
    board = document.getElementById('board')
    legend = document.getElementById('legend')
    pallette = document.getElementById('pallette')
    saveButton = document.getElementById('saveButton')
    savedSelect = document.getElementById('savedSelect')
    drawGrid()
    setRows()
    buildTileArray()
    buildLegend()
    makeSwatchKeys()
    buildPanel()
    activateButtons()
    changeLight(0)
    buildSavedSelect()

}

window.addEventListener("load", function () {
    init()
})
