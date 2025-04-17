const watercolorObject = [
    {
        name: 'Penguin',
        images: [
            '1',
            '2',
        ],
    },

]

const formattedImages = (arr, id) => {
    return arr.map(x =>  `images/${id}-${x}.jpg`)
}

const formattedWatercolorObject = watercolorObject.map(x => {
    const id = x.name.replace(' ', '').toLowerCase()
    return {
        name: x.name,
        id: id,
        images: formattedImages(x.images, id)
    }
})