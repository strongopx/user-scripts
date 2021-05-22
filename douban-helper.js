// ==UserScript==
// @name      douban helper
// @namespace ATGT
// @description  Copy English Title, Copy IMDb tt name
// @version  1
// @match    https://movie.douban.com/subject/*
// @grant    none
// ==/UserScript==

console.log(`=== douban-helper on '${location.href}' ===`);

function insertAfter(newNode, refNode) {
    refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
}

(function addCopyEnTitleBtn() {
    let title = document.querySelector('span[property="v:itemreviewed"]');
    console.log("title ", title.innerText);
    //let
    m = /\s+([\w\s,./;'<>?:"~!@#$%^&*\(\)_+-=]+)$/g.exec(title.parentNode.innerText);
    console.log("entitle m", m);
    let enTitleYear = m[1];
    let cpBtn = document.createElement('input');
    cpBtn.type = 'button';
    cpBtn.value = '📋 ' + enTitleYear;
    cpBtn.style.fontWeight = 'normal';
    cpBtn.style.marginLeft = '10px';
    cpBtn.style.padding = '3px 5px';
    cpBtn.style.borderRadius = '5px';
    cpBtn.onclick = (event) => {
        console.log('copy ' + enTitleYear);
        navigator.clipboard.writeText(enTitleYear);
    }
    insertAfter(cpBtn, title.nextElementSibling);
})();

(function addCopyIMDBttBtn() {
    let info = document.querySelector('#info');
    let m = info.innerText.match(/IMDb:\s*(tt\S+)/i);
    let ttval = m && m[1]
    console.log('IMDb ', ttval)
    if (ttval) {
      let cpBtn = document.createElement('input');
      cpBtn.type = 'button';
      cpBtn.value = '📋 ' + ttval;
      cpBtn.style.fontWeight = 'normal';
      cpBtn.style.marginLeft = '10px';
      cpBtn.style.padding = '3px 5px';
      cpBtn.style.borderRadius = '5px';
      cpBtn.onclick = (event) => {
        console.log('copy ' + ttval);
        navigator.clipboard.writeText(ttval);
      }
      insertAfter(cpBtn, info.lastElementChild);
      let link = document.createElement('A');
      link.href = 'https://www.imdb.com/title/'+ttval;
      link.target = '_blank';
      link.innerText  = '♐♐♐♐♐';
      insertAfter(link, info.lastElementChild);

    }
})();

console.log(`=== douban-helper on '${location.href}' ===`);
