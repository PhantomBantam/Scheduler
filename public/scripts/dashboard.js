const socket = io();
const titleIn = document.getElementById('title-in');
const notesIn = document.getElementById('notes-in');
const dateIn = document.getElementById('date-in');
const timeIn = document.getElementById('time-in');
const createBtn = document.getElementById('create-btn');
const refreshBtn = document.getElementById('refresh-btn');
const reminderContainer = document.getElementById('reminders');
const filterSelect = document.getElementById('filter-select');

const shrug = "¯\\_(ツ)_/¯";
var userInfo = null;
var sentReminds = [];

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

    titleIn.value = '';
    notesIn.value = ''; 
    dateIn.value = '';
    timeIn.value = '';


  }else{
    alert('You forgot the title!');
  }
});

refreshBtn.addEventListener('click', e=>{
  let changeArr = [];
  //each arr element constains title of remind

  Array.from(reminderContainer.children).forEach(element=>{
    changeArr.push({title:element.children[0].innerHTML, isActive: !element.children[3].checked});
  });

  socket.emit('refresh', {changeArr, userEmail: userInfo.user.email});
});

filterSelect.onchange = ()=>{
  switch(filterSelect.options[filterSelect.selectedIndex].value) {
    case 'all':
      showAll(sentReminds);
      break;

    case 'day':
      showDay(sentReminds);
      break;

    case 'active':
      showActive(sentReminds);
      break;
  }
};

socket.on('createdReminder', ({message, reminder})=>{
  if(message=='ok'){
    let elemArr = [];

    sentReminds.push(reminder);
    reminderContainer.innerHTML = '';

    sentReminds.forEach(reminder=>{
      elemArr.push(createRemindElem(reminder));
    });
  
    sortByDate(elemArr).forEach(elem=>{
      reminderContainer.appendChild(elem);
    });
  
  }else{
    alert(message);
  }
})

socket.on('userReminders', reminderArr=>{
  sentReminds = [];
  filterSelect.value = 'active';
  reminderArr.forEach(reminder=>{
    sentReminds.push(reminder);
  });
  showActive(reminderArr);
});

function createRemindElem(reminder){
  let reminderElem = document.createElement('div');
  reminderElem.setAttribute('class', 'reminder');

  let title = document.createElement('h4');
  let date = document.createElement('h5');
  let notes = document.createElement('p');
  let check = document.createElement('input');
  let deleteBtn = document.createElement('button');
  
  check.setAttribute('type', 'checkbox');
  check.checked = !reminder.isActive;
  deleteBtn.innerHTML = 'Delete Remind';

  let finalDate = shrug;

  let dateOb = new Date(reminder.remindDate);

  if(reminder.remindDate != null){
    const year = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(dateOb);
    const month = new Intl.DateTimeFormat('en', { month: 'long' }).format(dateOb);
    const day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(dateOb);
    const hour = new Intl.DateTimeFormat('en', { hour: '2-digit' }).format(dateOb);
    const minute = new Intl.DateTimeFormat('en', { minute: '2-digit' }).format(dateOb);
    
    finalDate = month + " " + day + ", " + year + "  |  " + 
                    hour.split(' ')[0] + ":" + minute +  " " +  hour.split(' ')[1].toLowerCase();  
  }

  convertStringToDate(finalDate);
  
  title.innerHTML = reminder.title;
  date.innerHTML = "Date: " + finalDate;
  notes.innerHTML = reminder.notes;


  reminderElem.appendChild(title);
  reminderElem.appendChild(date);
  reminderElem.appendChild(notes);
  reminderElem.appendChild(check);
  reminderElem.appendChild(deleteBtn);

  deleteBtn.addEventListener('click', e=>{
    let result = confirm('This remind will be deleted forever (a long time!)');
    if(result){
      e.target.parentNode.parentNode.removeChild(e.target.parentNode);
      socket.emit('deleteRemind', 
        {title: e.target.parentNode.children[0].innerHTML, userEmail: userInfo.user.email});
      
      sentReminds = sentReminds.filter(remind=>{
        return remind.title!=e.target.parentNode.children[0].innerHTML;
      });
    }
  });

  let currentDate = new Date();

  if(dateOb.getTime()<currentDate.getTime() && reminder.remindDate!=null){
    reminderElem.setAttribute('style', 'border: 2px red solid');

  } else if(reminder.remindDate==null){
    reminderElem.setAttribute('style', 'border: 1px yellow solid');
  }
  return reminderElem;
}

function convertStringToDate(str){
  if(str != "¯\\_(ツ)_/¯"){
    str = str.replace(',', '');
    let dateTimeSep = str.split('|');
    let dateSep = dateTimeSep[0].split(' ');
    let timeSep = dateTimeSep[1].split(':');
    let minuteSep = timeSep[1].split(' ');

    let hour = parseInt(timeSep[0]);
    if(minuteSep[1] == 'pm'){
      hour+=12;
    }

    let date = new Date(parseInt(dateSep[2]),
        getMonthNumFromName(dateSep[0]), 
        parseInt(dateSep[1]), 
        hour,
        parseInt(minuteSep[0]));
    return date;
  } else {
    return null;
  }
  
}

function getMonthNumFromName(month){
  switch(month){
    case 'January':
      return 0;
    case 'February':
      return 1;
    case 'March':
      return 2;
    case 'April':
      return 3;
    case 'May':
      return 4;
    case 'June':
      return 5;
    case 'July':
      return 6;
    case 'August':
      return 7;
    case 'September':
      return 8;
    case 'October':
      return 9;
    case 'November':
      return 10;
    case 'December':
      return 11;
  }
}

function sortByDate(elemArr){
  return elemArr.sort((x, y)=>{
    if(x.children[1].innerHTML.substr(6) == shrug){
      return -1;
    }else if(y.children[1].innerHTML.substr(6) == shrug){
      return -1;
    }


    let dateX = convertStringToDate(x.children[1].innerHTML.substr(6));
    let dateY = convertStringToDate(y.children[1].innerHTML.substr(6));
    if (dateX.getTime() < dateY.getTime()) {
      return -1;
    }
    if (dateX.getTime() > dateY.getTime()) {
      return 1;
    }
    return 0;
  });
}

function showActive(reminderArr) {
  let elemArr = [];
  reminderContainer.innerHTML = '';

  reminderArr.filter(reminder=>reminder.isActive).forEach(reminder=>{
    elemArr.push(createRemindElem(reminder));
  });

  sortByDate(elemArr).forEach(elem=>{
    reminderContainer.appendChild(elem);
  });
}

function showAll(reminderArr) {
  let elemArr = [];
  reminderContainer.innerHTML = '';

  reminderArr.forEach(reminder=>{
    elemArr.push(createRemindElem(reminder));
  });

  sortByDate(elemArr).forEach(elem=>{
    reminderContainer.appendChild(elem);
  });
}

function showDay(reminderArr) {
  let elemArr = [];
  reminderContainer.innerHTML = '';

  reminderArr.filter(reminder=>isToday(new Date(reminder.remindDate))).forEach(reminder=>{
    elemArr.push(createRemindElem(reminder));
  });

  sortByDate(elemArr).forEach(elem=>{
    reminderContainer.appendChild(elem);
  });
}

function isToday(someDate) {
  const today = new Date();
  return someDate.getDate() == today.getDate() &&
    someDate.getMonth() == today.getMonth() &&
    someDate.getFullYear() == today.getFullYear()
}