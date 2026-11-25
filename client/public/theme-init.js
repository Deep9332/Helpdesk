(function () {
  var t = localStorage.getItem("helpdesk-theme");
  if (t === "light") document.documentElement.classList.remove("dark");
})();
