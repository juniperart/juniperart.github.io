(function () {
    const main = document.querySelector('main')
    let lightboxContainer
    let watercolorContainer
    let mainImg
    let thumbnails
    let galleryContainer
    let displaySwitch
    let currIndex = 0
    let galleryDisplay = 0
    let modelParam

    // LIGHTBOX UTILS

    function removeActiveThumbnail() {
        thumbnails.forEach(x => {
            x.classList.remove('active')
        })
    }

    function setActiveThumbnail(i) {
        thumbnails[i]?.classList.add('active')
    }

    function getnewIndex(i, l) {
        const newIndex = currIndex === l - 1 ? 0 : i + 1
        currIndex = newIndex
        return newIndex
    }

    function changeImage(images, i) {
        mainImg = document.getElementById('mainImage')
        const newIndex = i === null ? getnewIndex(currIndex, images.length) : i
        removeActiveThumbnail()
        setActiveThumbnail(newIndex)
        mainImg.src = images[newIndex]
        currIndex = newIndex
    }


    const makeThumbnailsContainer = (arr) => {
        let thumbnailsContainer = document.createElement('div')
        thumbnailsContainer.classList.add('thumbnails-container')

        arr.forEach((x, i) => {
            let thumb = document.createElement('div')
            thumb.classList.add('thumbnail-image')
            thumb.innerHTML = `<img src="${x}"></img>`
            thumb.addEventListener('click', changeImage.bind(null, arr, i))
            
            thumbnailsContainer.appendChild(thumb);
        })

        return thumbnailsContainer
    }

    function openLightbox(i) {
        const watercolor = formattedWatercolorObject[i]

        let mainImgContainer = document.createElement('div')
        mainImgContainer.classList.add('image-main-container')
        watercolorContainer.appendChild(mainImgContainer)
        
        let orderedImages = [... watercolor.images]
        if (galleryDisplay) {
          orderedImages.unshift(orderedImages.pop())
        }
        mainImgContainer.addEventListener('click', changeImage.bind(null, orderedImages, null))
        
        let mainImg = document.createElement('img')
        mainImg.id = 'mainImage'
        let src = orderedImages[0]
        mainImg.src = src

        mainImgContainer.appendChild(mainImg)

        let thumbnailsContainer = makeThumbnailsContainer(orderedImages)

        if (orderedImages.length > 1) watercolorContainer.appendChild(thumbnailsContainer)
        thumbnails = Array.from(document.querySelectorAll('.thumbnails-container .thumbnail-image img'))
        setActiveThumbnail(0)

        lightboxContainer.classList.remove('hide')
    }

    function closeLightbox() {
        lightboxContainer.classList.add('hide')
        watercolorContainer.innerHTML = ''
        currIndex = 0
    }
  
    function makeLightbox() {
        lightboxContainer = document.createElement('div')
        lightboxContainer.classList.add('lightbox-container')
        if (modelParam) lightboxContainer.classList.add('model-showcase')
        lightboxContainer.classList.add('hide')
        
        const closeButton = document.createElement('div')
        closeButton.classList.add('lightbox-close')
        closeButton.innerHTML = '&#x2716;&#xFE0E;'
        closeButton.addEventListener('click', closeLightbox)
        lightboxContainer.appendChild(closeButton)
        
        const exitOverlay = document.createElement('div')
        exitOverlay.classList.add('exit-overlay')
        exitOverlay.addEventListener('click', closeLightbox)
        lightboxContainer.appendChild(exitOverlay)
        
        watercolorContainer = document.createElement('div')
        watercolorContainer.classList.add('watercolor-container')
        lightboxContainer.appendChild(watercolorContainer)
        
        main.appendChild(lightboxContainer)
    }

    // GALLERY

    function switchGalleryDisplay() {
        galleryContainer.innerHTML = ''
        galleryDisplay = !galleryDisplay
 
        populateGallery()
    }

    const makeDummyImage= () => {
        let dummy = document.createElement('div')
        dummy.classList.add('gallery-image')
        galleryContainer.appendChild(dummy)
    }

    function populateGallery() {
        galleryContainer.classList.add('gallery-container')

        displaySwitch = document.createElement('div')
        displaySwitch.classList.add('gallerySwitch')
        if (galleryDisplay) {
            galleryContainer.classList.add('cp')
        } else {
            galleryContainer.classList.remove('cp')
        }
        displaySwitch.addEventListener('click', switchGalleryDisplay)
        displaySwitch.innerHTML = `
            <div class="switch">Models</div>
            <div class="switch">Crease Patterns</div>
        `
        galleryContainer.appendChild(displaySwitch)

        formattedWatercolorObject.forEach((x, i) => {
            const galleryImage = document.createElement('div')
            galleryImage.classList.add('gallery-image')
            const imageSrc = galleryDisplay ? x.images[x.images.length - 1] : x.images[0]
            //galleryImage.innerHTML = `<img src="${x.images[0]}"></img>`
            galleryImage.innerHTML = `<img src="${imageSrc}"></img>`
            galleryImage.addEventListener('click', openLightbox.bind(null, i))
            galleryContainer.appendChild(galleryImage)

            const galleryOverlay = document.createElement('div')
            galleryOverlay.classList.add('gallery-overlay')
           // galleryOverlay.innerHTML = `<h4>${x.name}</h4>`  <-- Don't show title
            galleryImage.appendChild(galleryOverlay)
        })

        if (formattedWatercolorObject.length % 3 === 2) {
            makeDummyImage()
        }
    }

    function initializeGallery() {
        galleryContainer = document.createElement('div')
        main.appendChild(galleryContainer)
    }

    // check query string
    function getQueryVariable(param) {
        const query = window.location.search.substring(1);
        const params = query.split("&")
        params.forEach(x =>  {
            const pair = x.split("=")
            if (pair[0] == param){
                modelParam = pair[1]
            }
        })
        return(modelParam);
    }

    function inializeModelShowcase(model) {
        const modelIndex = formattedWatercolorObject.findIndex(x => x.id === model)
        main.innerHTML += `
            <h3>${formattedWatercolorObject[modelIndex].name}</h3>
            <a href="/watercolor">\< All watercolor</a>
        `
        makeLightbox()
        openLightbox(modelIndex)
    }

    if (getQueryVariable('model')) {
        inializeModelShowcase(modelParam)
    } else {
        initializeGallery()
        populateGallery()
        makeLightbox()
    }
    
})();