(() => {
  const sections = document.querySelectorAll("section");

  sections.forEach((section) => {
    const tabs = section.querySelectorAll(".tab");
    const panels = section.querySelectorAll(".panel");
    if (!tabs.length || !panels.length) {
      return;
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.getAttribute("data-tab");

        tabs.forEach((t) => t.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));

        tab.classList.add("active");
        const panel = section.querySelector(`.panel[data-panel="${target}"]`);
        if (panel) {
          panel.classList.add("active");
        }
      });
    });
  });
})();
