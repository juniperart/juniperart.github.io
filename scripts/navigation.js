(function () {

const page = document.querySelector('body').id

const links = [
    { 
        text: 'Origami',
        href: 'https://juniperorigami.com'
    },
    {
        text: 'Watercolor'
    },
    {
        text: 'Swatches'
    },
    {
        text: 'Librarian'
    },
]

const navigation = document.querySelector('nav')
const logo = document.querySelector('.logo')

let navHTML = ''

links.forEach((x, i) => {
    const path = x.text.charAt(0).toLowerCase() + x.text.slice(1)
    const href = x.href ? x.href : `/${path}`
    navHTML += `
        <div class="nav-item${x === page ? ' active' : ''}">
            <a href="${href}">
                <span>${x.text}</span>
            </a>
        </div>
    `
})

navigation.innerHTML = navHTML

logo.innerHTML = `
    <a href="/">
        <img src="/julie-juniper.png">
    </a>
`

})();