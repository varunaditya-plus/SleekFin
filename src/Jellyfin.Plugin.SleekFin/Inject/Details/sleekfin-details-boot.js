(function () {
    'use strict';

    var root = document.documentElement;
    var concealedClass = 'sleekfin-details-concealed';
    var concealEvent = 'sleekfin:details-conceal';

    if (!root || root.hasAttribute('data-sleekfin-details-boot')) return;
    root.setAttribute('data-sleekfin-details-boot', 'true');

    var failsafe = 0;
    var concealed = false;

    function clearFailsafe() {
        window.clearTimeout(failsafe);
        failsafe = 0;
    }

    function armFailsafe() {
        clearFailsafe();
        if (!root.classList.contains(concealedClass)) return;
        failsafe = window.setTimeout(function () {
            failsafe = 0;
            root.classList.remove(concealedClass);
        }, 4000);
    }

    function syncFailsafe() {
        var next = root.classList.contains(concealedClass);
        if (next === concealed) return;
        concealed = next;
        if (concealed) armFailsafe();
        else clearFailsafe();
    }

    function isDetailsRoute() {
        var target = window.location.hash.slice(1);
        if (!target) target = window.location.pathname + window.location.search;
        target = target.replace(/^!+/, '');
        var separator = target.search(/[?&]/);
        var path = (separator < 0 ? target : target.slice(0, separator)).replace(/^[!/]+/, '/');
        return /(^|\/)details\/?$/.test(path);
    }

    // Detail-to-detail navigation can leave the class set, so class mutations alone cannot restart the failsafe.
    document.addEventListener(concealEvent, armFailsafe);
    new MutationObserver(syncFailsafe).observe(root, { attributes: true, attributeFilter: ['class'] });

    if (isDetailsRoute()) root.classList.add(concealedClass);
    syncFailsafe();
})();
