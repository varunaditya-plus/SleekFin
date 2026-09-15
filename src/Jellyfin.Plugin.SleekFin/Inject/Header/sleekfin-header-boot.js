(function () {
    'use strict';

    var root = document.documentElement;
    var concealingClass = 'sleekfin-header-concealing';
    var mountedClass = 'sleekfin-header-mounted';

    if (!root || root.hasAttribute('data-sleekfin-header-boot')) return;
    root.setAttribute('data-sleekfin-header-boot', 'true');

    // Jellyfin paints its own header first and SleekFin adopts and restyles that same element about
    // 1.3s later, so the native chrome is visible unless it is concealed from the first paint. That
    // is why this runs as a blocking script in the head, and why the conceal lifts on the mount class
    // rather than on a replacement element appearing. SleekFin restyles the element in place, so a
    // conceal that outlived the mount would hide the finished header too.
    //
    // Concealing is guarded so it cannot feed itself: the observer watches the class attribute this
    // script writes, so concealing again in response to its own write would never settle. It writes
    // the class at most once, `settled` latches on every exit, and the observer disconnects as soon
    // as the conceal is released. The write is latched separately from `settled` because the header
    // feature clears the conceal when it decides not to own the header, which is the case on
    // dashboard routes and TV layouts; without that latch the observer would put the conceal
    // straight back and the native header would stay hidden until the failsafe. The failsafe covers
    // a header bundle that never arrives. The CSS gives the mounted rule priority, so an adopted
    // header is visible even in the task where both classes overlap.
    var settled = false;
    var concealed = false;
    var failsafe = 0;
    var observer = null;

    // A signed out client only reaches pages SleekFin has no header for, and what the conceal hides
    // there is Jellyfin's native bar with nothing in it but a logo above a form SleekFin does not
    // style. The signed in state is read when the failsafe asks rather than at first paint, because
    // the client restores a stored session a few hundred milliseconds in, which is also what decides
    // whether a header is ever adopted. A client that is not there at all releases, like any other
    // unknown state.
    function isSignedOut() {
        var apiClient = window.ApiClient;
        return Boolean(apiClient && typeof apiClient.getCurrentUserId === 'function' && !apiClient.getCurrentUserId());
    }

    function release() {
        settled = true;
        window.clearTimeout(failsafe);
        failsafe = 0;
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        root.classList.remove(concealingClass);
    }

    // The failsafe covers a header bundle that never arrives, so while nobody is signed in it must not
    // lift the conceal, because hidden is the wanted result on those pages. It keeps checking
    // instead, so signing in still reveals a header when no bundle is left to do it.
    function failsafeCheck() {
        if (isSignedOut()) {
            failsafe = window.setTimeout(failsafeCheck, 1000);
            return;
        }

        release();
    }

    function sync() {
        if (settled) return;
        if (root.classList.contains(mountedClass)) {
            release();
            return;
        }
        if (concealed) return;

        concealed = true;
        root.classList.add(concealingClass);
        failsafe = window.setTimeout(failsafeCheck, 4000);
    }

    if (root.classList.contains(mountedClass)) {
        settled = true;
        return;
    }

    observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    sync();
})();
