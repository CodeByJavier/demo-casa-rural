/**
 * CASA VERDÉS — ALOJAMIENTO RURAL
 * JavaScript en vanilla JS, sin dependencias. Cada módulo "init..." es
 * independiente y se ejecuta aislado con safeRun(), de forma que si uno falla
 * (por ejemplo porque falta un elemento) el resto de la página sigue viva.
 *
 * Piezas nuevas respecto a las plantillas anteriores:
 *  - initMenu:     en móvil, panel lateral con trampa de foco; en escritorio
 *                  no hace nada porque la navegación ya está a la vista.
 *  - initLightbox: visor de imágenes accesible (diálogo modal, teclado, foco).
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    safeRun(setFooterYear);
    safeRun(initHeaderScroll);
    safeRun(initMenu);
    safeRun(initReveal);
    safeRun(initLightbox);
    safeRun(initBookingForm);
  }

  function safeRun(fn) {
    try {
      fn();
    } catch (error) {
      console.error("[CasaVerdes] Error en " + fn.name + ":", error);
    }
  }

  /* =====================================================================
   * Utilidades compartidas
   * =================================================================== */

  var FOCUSABLE = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  /**
   * Mantiene el foco dentro de un contenedor mientras está abierto.
   * Es lo que convierte una capa "que tapa la pantalla" en un diálogo de
   * verdad: sin esto, con el tabulador te vas a los enlaces de detrás y el
   * lector de pantalla se pierde fuera de la ventana modal.
   * Devuelve una función para desactivarlo.
   */
  /**
   * Mueve el foco a un elemento de una capa que se acaba de abrir.
   * focus() sobre un elemento con visibility:hidden no hace nada y no da
   * error. Por eso el CSS cambia visibility al instante al abrir (sin
   * transición) y aquí se fuerza el cálculo de estilos antes de enfocar.
   * Si aun así no lo consigue, lo reintenta en el siguiente fotograma.
   */
  function focusWhenVisible(el) {
    if (!el) return;
    void el.offsetHeight;
    el.focus();
    if (document.activeElement !== el) {
      window.requestAnimationFrame(function () {
        el.focus();
      });
    }
  }

  function trapFocus(container) {
    function onKeydown(event) {
      if (event.key !== "Tab") return;

      var items = Array.prototype.filter.call(
        container.querySelectorAll(FOCUSABLE),
        function (el) {
          return el.offsetParent !== null || el === document.activeElement;
        }
      );
      if (!items.length) return;

      var first = items[0];
      var last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeydown);
    return function release() {
      document.removeEventListener("keydown", onKeydown);
    };
  }

  /** Bloquea el scroll del fondo compensando el ancho de la barra para que no "salte". */
  function lockScroll(locked) {
    if (locked) {
      var gap = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (gap > 0) document.body.style.paddingRight = gap + "px";
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
  }

  /* =====================================================================
   * Año del pie
   * =================================================================== */
  function setFooterYear() {
    var year = new Date().getFullYear();
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = year;
    });
  }

  /* =====================================================================
   * Cabecera: pasa a sólida al bajar
   * =================================================================== */
  function initHeaderScroll() {
    var header = document.getElementById("header");
    if (!header) return;

    function onScroll() {
      header.classList.toggle("is-scrolled", window.scrollY > 40);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* =====================================================================
   * Menú móvil: panel lateral
   * En escritorio la navegación es una barra visible y este módulo no
   * interviene; solo actúa cuando el CSS ha convertido la <nav> en panel.
   * =================================================================== */
  function initMenu() {
    var btn = document.getElementById("menuBtn");
    var nav = document.getElementById("menu");
    var header = document.getElementById("header");
    var backdrop = document.getElementById("navBackdrop");
    if (!btn || !nav || !header || !backdrop) return;

    var label = btn.querySelector("[data-menu-label]");
    // Debe coincidir con la media query del CSS (max-width: 959px)
    var mobile = window.matchMedia("(max-width: 959px)");
    var releaseTrap = null;

    function isOpen() {
      return nav.classList.contains("is-open");
    }

    function open() {
      nav.classList.add("is-open");
      backdrop.hidden = false;
      void backdrop.offsetHeight; // estado inicial para que se vea el fundido
      backdrop.classList.add("is-visible");
      btn.setAttribute("aria-expanded", "true");
      if (label) label.textContent = "Cerrar";
      lockScroll(true);
      // La trampa abarca toda la cabecera: así el botón de cerrar, que está
      // fuera de la <nav>, sigue siendo alcanzable con el tabulador.
      releaseTrap = trapFocus(header);
      focusWhenVisible(nav.querySelector("a[href]"));
    }

    function close(returnFocus) {
      if (!isOpen()) return;
      nav.classList.remove("is-open");
      backdrop.classList.remove("is-visible");
      btn.setAttribute("aria-expanded", "false");
      if (label) label.textContent = "Menú";
      lockScroll(false);
      if (releaseTrap) {
        releaseTrap();
        releaseTrap = null;
      }
      if (returnFocus !== false) btn.focus();

      window.setTimeout(function () {
        if (!isOpen()) backdrop.hidden = true;
      }, 400);
    }

    btn.addEventListener("click", function () {
      if (isOpen()) close();
      else open();
    });

    backdrop.addEventListener("click", function () {
      close();
    });

    nav.querySelectorAll("a[href^='#']").forEach(function (link) {
      link.addEventListener("click", function () {
        close(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });

    // Si se agranda la ventana con el panel abierto (girar una tablet,
    // por ejemplo), se cierra para no dejar el scroll bloqueado.
    function onBreakpointChange(event) {
      if (!event.matches) close(false);
    }
    if (mobile.addEventListener) mobile.addEventListener("change", onBreakpointChange);
    else if (mobile.addListener) mobile.addListener(onBreakpointChange);
  }

  /* =====================================================================
   * Aparición al hacer scroll
   * =================================================================== */
  function initReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    items.forEach(function (item) {
      var delay = item.getAttribute("data-reveal-delay");
      if (delay) item.style.setProperty("--reveal-delay", delay + "ms");
    });

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (item) {
        item.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  /* =====================================================================
   * Visor de imágenes a pantalla completa
   * =================================================================== */
  function initLightbox() {
    var gallery = document.querySelector("[data-gallery]");
    var box = document.getElementById("lightbox");
    if (!gallery || !box) return;

    var triggers = Array.prototype.slice.call(gallery.querySelectorAll(".mosaic__item"));
    if (!triggers.length) return;

    var img = box.querySelector("[data-lightbox-img]");
    var caption = box.querySelector("[data-lightbox-caption]");
    var counter = box.querySelector("[data-lightbox-counter]");
    var btnPrev = box.querySelector("[data-lightbox-prev]");
    var btnNext = box.querySelector("[data-lightbox-next]");
    var btnClose = box.querySelector("[data-lightbox-close]");

    var index = 0;
    var lastFocused = null;
    var releaseTrap = null;

    // Se guardan los datos de cada imagen una sola vez
    var slides = triggers.map(function (trigger) {
      var thumb = trigger.querySelector("img");
      return {
        src: thumb ? thumb.getAttribute("src") : "",
        alt: thumb ? thumb.getAttribute("alt") : "",
        caption: trigger.getAttribute("data-caption") || (thumb ? thumb.getAttribute("alt") : ""),
      };
    });

    function render() {
      var slide = slides[index];
      img.setAttribute("src", slide.src);
      img.setAttribute("alt", slide.alt);
      if (caption) caption.textContent = slide.caption;
      if (counter) counter.textContent = index + 1 + " / " + slides.length;
    }

    function open(i) {
      index = i;
      lastFocused = document.activeElement;
      render();
      box.hidden = false;
      void box.offsetHeight;
      box.classList.add("is-open");
      lockScroll(true);
      releaseTrap = trapFocus(box);
      focusWhenVisible(btnClose);
    }

    function close() {
      box.classList.remove("is-open");
      lockScroll(false);
      if (releaseTrap) {
        releaseTrap();
        releaseTrap = null;
      }
      // Devolver el foco a la miniatura desde la que se abrió: si no, el
      // usuario de teclado vuelve al principio del documento.
      if (lastFocused && lastFocused.focus) lastFocused.focus();

      window.setTimeout(function () {
        if (!box.classList.contains("is-open")) box.hidden = true;
      }, 350);
    }

    function go(step) {
      index = (index + step + slides.length) % slides.length;
      render();
    }

    triggers.forEach(function (trigger, i) {
      trigger.addEventListener("click", function () {
        open(i);
      });
    });

    if (btnPrev) btnPrev.addEventListener("click", function () { go(-1); });
    if (btnNext) btnNext.addEventListener("click", function () { go(1); });
    if (btnClose) btnClose.addEventListener("click", close);

    // Pulsar en el fondo (fuera de la imagen y de los botones) cierra
    box.addEventListener("click", function (event) {
      if (event.target === box || event.target.classList.contains("lightbox__stage")) close();
    });

    document.addEventListener("keydown", function (event) {
      if (!box.classList.contains("is-open")) return;
      if (event.key === "Escape") close();
      else if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "ArrowRight") go(1);
    });
  }

  /* =====================================================================
   * Formulario de reserva
   * =================================================================== */
  function initBookingForm() {
    var form = document.getElementById("bookingForm");
    if (!form) return;

    var submitBtn = document.getElementById("submitBtn");
    var submitLabel = form.querySelector("[data-submit-label]");
    var spinner = form.querySelector("[data-spinner]");
    var statusBox = form.querySelector("[data-form-status]");

    function today() {
      var d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }

    function parseDate(value) {
      return value ? new Date(value + "T00:00:00") : null;
    }

    var validators = {
      checkin: function (value) {
        var date = parseDate(value);
        if (!date) return "Indica la fecha de entrada.";
        return date >= today() ? "" : "La entrada no puede ser anterior a hoy.";
      },
      checkout: function (value) {
        var date = parseDate(value);
        if (!date) return "Indica la fecha de salida.";
        var checkin = parseDate(form.elements.checkin.value);
        if (checkin && date <= checkin) return "La salida debe ser posterior a la entrada.";
        return "";
      },
      guests: function (value) {
        return value ? "" : "Indica cuántos vais a ser.";
      },
      name: function (value) {
        return value.trim().length >= 2 ? "" : "Escribe tu nombre.";
      },
      email: function (value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
          ? ""
          : "Escribe un correo electrónico válido.";
      },
      privacy: function (_value, input) {
        return input.checked ? "" : "Debes aceptar la política de privacidad.";
      },
    };

    function validateField(input) {
      var validator = validators[input.name];
      if (!validator) return true;

      var message = validator(input.value, input);
      var wrapper = input.closest(".field");
      var errorEl = form.querySelector('[data-error-for="' + input.name + '"]');

      if (wrapper) wrapper.classList.toggle("has-error", Boolean(message));
      if (errorEl) errorEl.textContent = message;
      return !message;
    }

    var tracked = Array.prototype.filter.call(form.elements, function (el) {
      return el.name && validators[el.name];
    });

    tracked.forEach(function (input) {
      var evt =
        input.tagName === "SELECT" || input.type === "date" || input.type === "checkbox"
          ? "change"
          : "blur";
      input.addEventListener(evt, function () {
        validateField(input);
        // Al cambiar la entrada, la salida puede quedar inválida: se revisa
        if (input.name === "checkin" && form.elements.checkout.value) {
          validateField(form.elements.checkout);
        }
      });
      input.addEventListener("input", function () {
        var wrapper = input.closest(".field");
        if (wrapper && wrapper.classList.contains("has-error")) validateField(input);
      });
    });

    function showStatus(state, message) {
      if (!statusBox) return;
      statusBox.hidden = false;
      statusBox.setAttribute("data-state", state);
      statusBox.textContent = message;
    }

    function setLoading(loading) {
      if (submitBtn) submitBtn.disabled = loading;
      if (spinner) spinner.hidden = !loading;
      if (submitLabel) {
        submitLabel.textContent = loading ? "Enviando..." : "Consultar disponibilidad";
      }
    }

    /**
     * Envío simulado. Sustituir por una llamada real, por ejemplo:
     *   fetch('/api/reservas', { method: 'POST', body: JSON.stringify(payload) })
     * En la demo falla un 12% de las veces para poder ver el estado de error.
     */
    function send(payload) {
      return new Promise(function (resolve, reject) {
        window.setTimeout(function () {
          if (Math.random() < 0.88) resolve({ ok: true, payload: payload });
          else reject(new Error("No se ha podido enviar la consulta. Inténtalo de nuevo en unos segundos."));
        }, 1100);
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (statusBox) statusBox.hidden = true;

      var valid = tracked.map(validateField).every(Boolean);
      if (!valid) {
        showStatus("error", "Revisa los campos marcados antes de enviar.");
        var firstInvalid = form.querySelector(".has-error input, .has-error select, .has-error textarea");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var payload = {};
      new FormData(form).forEach(function (value, key) {
        payload[key] = value;
      });

      setLoading(true);

      send(payload)
        .then(function () {
          showStatus(
            "success",
            "¡Gracias! Hemos recibido tu consulta y te contestamos hoy mismo con la disponibilidad."
          );
          form.reset();
          tracked.forEach(function (input) {
            var wrapper = input.closest(".field");
            if (wrapper) wrapper.classList.remove("has-error");
          });
        })
        .catch(function (error) {
          showStatus("error", error.message || "Ha ocurrido un error inesperado.");
        })
        .finally(function () {
          setLoading(false);
        });
    });
  }
})();
