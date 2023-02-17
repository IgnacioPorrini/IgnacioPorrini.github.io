(function () {
    // Obtén el encabezado
    const header = document.querySelector('header');

    // Añade un evento de desplazamiento al documento
    document.addEventListener('scroll', () => {
        // Verifica si la página está desplazada más de 60 píxeles
        if (window.pageYOffset > 60) {
            // Agrega la clase "scrolled" al encabezado
            document.querySelector('header').classList.add('scrolled');
        } else {
            // Elimina la clase "scrolled" del encabezado
            document.querySelector('header').classList.remove('scrolled');
        }
    });
})();