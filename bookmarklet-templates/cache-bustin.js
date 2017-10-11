javascript: (function () {
  let s = document.createElement('script');
  s.id = 'myawesomebookmarkletyeah'; // give your bookmarklet an ID maybe
  s.src = window.location.protocol + '//www.example.com?' + (new Date()).valueOf();
  document.body.appendChild(s);
 }());