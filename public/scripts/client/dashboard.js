const socket = io();
const titleIn = document.getElementById('title-in');
const notesIn = document.getElementById('notes-in');
const dateIn = document.getElementById('date-in');
const timeIn = document.getElementById('time-in');
const createBtn = document.getElementById('create-btn');
const templateBtn = document.getElementById('template-btn');
const deleteTemplateBtn = document.getElementById('delete-template-btn');
const reminderContainer = document.getElementById('reminders');
const filterSelect = document.getElementById('filter-select');
const templateSelect = document.getElementById('template-select');

const publicVapidKey = "BB5bXr4yikExGVjy8Tu2WEkMm0xjg7xdd6-Jf2M6wqxKSiF-afqE87iHnUl2NAcvEA6CHpcNbfUEunDgQY97UCM";
const shrug = "¯\\_(ツ)_/¯";
var userInfo = null;
var sentReminds = [];
var sentTemplates = [];
var workerAvailable = false;

deleteTemplateBtn.setAttribute('style', 'display:none');

//check if service workers are available in current browser
if('serviceWorker' in navigator){
  workerAvailable = true;
}

async function send(message) {
  // Register Service Worker
  const register = await navigator.serviceWorker.register("/worker.js", {
    scope: "/"
  });

  // Register Push
  const subscription = await register.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
  });

  // Send Push Notification
  await fetch("/users/subscribe", {
    method: "POST",
    body: JSON.stringify({
      subscription:subscription,
      message: message
    }),
    headers: {
      "content-type": "application/json"
    }
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

fetch('./api/user_data')
  .then(response=>response.json())
  .then(data=>{
    userInfo = data
    socket.emit('start', userInfo);
  })
  .catch(err=>console.log(err));

createBtn.addEventListener('click', e=>{  
  if(titleIn.value.trim() != ''){
    socket.emit('createRemind', {
      title: titleIn.value, 
      notes: notesIn.value, 
      date: dateIn.value, 
      time: timeIn.value,
      userEmail: userInfo.user.email
    });
  }else{
    alert('You forgot the title!');
  }
});

templateBtn.addEventListener('click', e=>{  
  if(titleIn.value.trim() != ''){
    socket.emit('createTemplate', {
      title: titleIn.value, 
      notes: notesIn.value, 
      userEmail: userInfo.user.email
    });
  }else{
    alert('You forgot the title!');
  }
});

deleteTemplateBtn.addEventListener('click', e=>{  
  if(titleIn.value.trim() != ''){
    let result = confirm('This remind will be deleted forever (a long time!)');
    if(result){
      socket.emit('deleteTemplate', {
        title: titleIn.value, 
        userEmail: userInfo.user.email
      });
    }
  }else{
    alert('You need to specify a title!');
  }
});
    
filterSelect.onchange = ()=>{
  let elemArr;
  reminderContainer.innerHTML = '';

  switch(filterSelect.options[filterSelect.selectedIndex].value) {
    case 'all':
      elemArr = filterAll(sentReminds);
      break;

    case 'day':
      elemArr = filterDay(sentReminds);
      break;

    case 'active':
      elemArr = filterActive(sentReminds);
      break;

    case 'inactive':
      elemArr = filterInactive(sentReminds);
      break;

    case 'starred':
      elemArr = filterStarred(sentReminds);
      break;

    case 'unstarred':
      elemArr = filterUnstarred(sentReminds);
      break;
  }

  sortByDate(elemArr).forEach(elem=>{
    reminderContainer.appendChild(elem);
  });
};

templateSelect.onchange = ()=>{
  for (let i of sentTemplates) {
    if(templateSelect.options[templateSelect.selectedIndex].value == 'No Template'){
      titleIn.value = '';
      notesIn.value = ''; 
      deleteTemplateBtn.setAttribute('style', 'display:none');
      break;
    }else if(i.title == templateSelect.options[templateSelect.selectedIndex].value){
      titleIn.value = i.title;
      notesIn.value = i.notes; 
      deleteTemplateBtn.setAttribute('style', 'display:block');
      break;
    }
  }
};

socket.on('createdReminder', ({message, reminder})=>{
  if(message=='ok'){
    let elemArr = [];

    titleIn.value = '';
    notesIn.value = ''; 
    dateIn.value = '';
    timeIn.value = '';

    sentReminds.push(reminder);
    reminderContainer.innerHTML = '';

    sentReminds.forEach(reminder=>{
      elemArr.push(createRemindElem(reminder));
    });
  
    sortByDate(elemArr).forEach(elem=>{
      reminderContainer.appendChild(elem);
    });
    setAlarms([reminder]);

  } else if(message == 'already exists'){
    let newTitle = prompt('This title already exists within your reminds! Please type in a new one.');

    while(newTitle==''){
      newTitle = prompt('Please type in a new one');
    }

    socket.emit('createRemind', {
      title: newTitle, 
      notes: notesIn.value, 
      date: dateIn.value, 
      time: timeIn.value,
      userEmail: userInfo.user.email
    });
  } else{
    alert(message);
  }
})

socket.on('createdTemplate', ({message, template})=>{
  if(message=='ok'){
    titleIn.value = '';
    notesIn.value = ''; 
    dateIn.value = '';
    timeIn.value = '';

    sentTemplates.push(template);
    let option = document.createElement('option');
    option.innerHTML = template.title;
    templateSelect.appendChild(option);

  } else if(message == 'already exists'){
    let newTitle = prompt('This title already exists within your reminds! Please type in a new one.');
    while(newTitle==''){
      newTitle = prompt('Please type in a new one');
    }
    socket.emit('createTemplate', {
      title: newTitle, 
      notes: notesIn.value, 
      userEmail: userInfo.user.email
    });
  } else{
    alert(message);
  }
})

socket.on('deletedTemplate', ({message, title})=>{
  if(message=='ok'){
    titleIn.value = '';
    notesIn.value = ''; 
    dateIn.value = '';
    timeIn.value = '';

    for (const template of sentTemplates) {
      if(template.title==title){
        sentTemplates.splice(sentTemplates.indexOf(template), 1);
        break;
      }
    }

    for (const option of templateSelect) {
      if(option.innerHTML == title){
        templateSelect.removeChild(option);
      }
    }

    if(templateSelect.options[templateSelect.selectedIndex].value == 'No Template'){
      deleteTemplateBtn.setAttribute('style', 'display:none');
    }

  } else if(message == '404'){
    alert('Could not find a template with the name: ' + title);
  } else{
    alert(message);
  }
})

socket.on('userReminders', ({reminderArr, templateArr})=>{
  sentReminds = [];

  filterSelect.value = 'active';
  reminderArr.forEach(reminder=>{
    sentReminds.push(reminder);
  });

  templateArr.forEach(template=>{
    sentTemplates.push(template);

    let option = document.createElement('option');
    option.innerHTML = template.title;
    templateSelect.appendChild(option);
  });

  setAlarms(reminderArr);
  sortByDate(filterActive(reminderArr)).forEach(elem=>{
    reminderContainer.appendChild(elem);
  });
});

socket.on('updatedActive', ({message, title, isActive})=>{
  if(message === 'ok'){
    for(let reminder of sentReminds){
      if(reminder.title==title){
        reminder.isActive = isActive;
        break;
      }
    }

    if((!isActive && filterSelect.options[filterSelect.selectedIndex].value == 'active') || 
    (isActive && filterSelect.options[filterSelect.selectedIndex].value == 'inactive')){
      for(let elem of reminderContainer.children){
        if(elem.children[0].innerHTML == title){
          reminderContainer.removeChild(elem);
        }
      }
    }
  }else{
    alert(message);
  }
});

socket.on('updatedStarred', ({message, title, isStarred})=>{
  if(message === 'ok'){
    for(let reminder of sentReminds){
      if(reminder.title==title){
        reminder.isStarred = isStarred;
        break;
      }
    }
    
    if((!isStarred && filterSelect.options[filterSelect.selectedIndex].value == 'starred') || 
    (isStarred && filterSelect.options[filterSelect.selectedIndex].value == 'unstarred')){
      for(let elem of reminderContainer.children){
        if(elem.children[0].innerHTML == title){
          reminderContainer.removeChild(elem);
        }
      }
    }else{
      reminderContainer.innerHTML = '';
      sortByDate(filterActive(sentReminds)).forEach(elem=>{
        reminderContainer.appendChild(elem);
      });
    }
  }else{
    alert(message);
  }
});