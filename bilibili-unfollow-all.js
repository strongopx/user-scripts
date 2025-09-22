// ==UserScript==
// @name     bilibili unfollow all
// @match    https://space.bilibili.com/*/relation/follow*
// @version  1
// @grant    none
// @run-at   document-end
// ==/UserScript==


function msleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

console.log('====== unfollow all')
async function unfollowAllThisPage() {
  let followers = document.querySelectorAll('.follow-btn__trigger.gray')
  if (!followers.length) {
    console.log('no followers')
    return
  }
	for (let btn of followers) {
    let phoneVerify = document.querySelector('.phone-input')
    if (phoneVerify) {
      phoneVerify.value = "xxxxxxx?????"
     	try {
      	document.querySelector('.phone-confirm').click()
      } catch (e) {
        console.log('exception', e)
        return
      }
    }
    btn.click()
    await msleep(rand(700, 3000))
  }
  msleep(rand(3000, 6000))
  location.reload()
}

let ufbtn = document.createElement('div')
ufbtn.innerHTML = `<div type="button" style="position: fixed; left: 10px; bottom: 10px; color: orange; ">UNFOLLOW ALL</div>`
ufbtn.onclick = unfollowAllThisPage
document.body.append(ufbtn);

setTimeout(unfollowAllThisPage, rand(2000, 6000))