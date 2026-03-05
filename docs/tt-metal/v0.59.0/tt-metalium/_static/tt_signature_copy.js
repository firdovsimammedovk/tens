(function () {
  "use strict";

  function copyText(text, onSuccess) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(function () {});
      return;
    }

    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // Ignore copy failures.
    } finally {
      document.body.removeChild(textarea);
    }
  }

  function addCopyButton(section, codeBlock) {
    var highlight = codeBlock.closest(".highlight");
    if (!highlight || highlight.querySelector(".tt-copy-btn")) {
      return;
    }

    var button = document.createElement("button");
    button.type = "button";
    button.className = "tt-copy-btn";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy signature");

    button.addEventListener("click", function () {
      var text = codeBlock.textContent.replace(/\s+$/g, "");
      copyText(text, function () {
        button.textContent = "Copied";
        window.setTimeout(function () {
          button.textContent = "Copy";
        }, 1200);
      });
    });

    section.classList.add("tt-signature");
    highlight.appendChild(button);
  }

  function initSignatureCopyButtons() {
    var sections = document.querySelectorAll(".section");
    sections.forEach(function (section) {
      var heading = section.querySelector("h1, h2, h3, h4, h5, h6");
      if (!heading) {
        return;
      }
      var title = heading.textContent.trim().toLowerCase();
      if (title !== "signature") {
        return;
      }
      var codeBlock = section.querySelector("div.highlight pre");
      if (!codeBlock) {
        return;
      }
      addCopyButton(section, codeBlock);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSignatureCopyButtons);
  } else {
    initSignatureCopyButtons();
  }
})();

