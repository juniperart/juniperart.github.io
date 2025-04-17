(function () {

const page = document.querySelector('body').id

const links = [
    'watercolor',
]

const navigation = document.querySelector('nav')
const mobileLogo = document.querySelector('.logo-mobile')

const logo = `
    <div class="logo-desktop">
        <a href="/">
            <img src="/julie-juniper.png">
        </a>
    </div>
`

let navHTML = ''

links.forEach((x, i) => {
    navHTML += `
        <div class="nav-item${x === page ? ' active' : ''}">
            <a href="/${x}">
                <span>${x.charAt(0).toUpperCase() + x.slice(1)}</span>
            </a>
        </div>
    `
    if (i === 1) {
        navHTML += logo
    }
})

navigation.innerHTML = navHTML

mobileLogo.innerHTML = `
    <a href="/">
        <img src="/julie-juniper.png">
    </a>
`

})();