function createRemindElem(reminder){
  let reminderElem = document.createElement('div');
  reminderElem.setAttribute('class', 'reminder');

  let {title, date, notes, check, deleteBtn, starBtn} = 
    generateReminderChildren(reminder, reminderElem);

  reminderElem.appendChild(title);
  reminderElem.appendChild(date);
  reminderElem.appendChild(notes);
  reminderElem.appendChild(check);
  reminderElem.appendChild(deleteBtn);
  reminderElem.appendChild(starBtn);

  deleteBtn.addEventListener('click', deleteBtnListener);
  check.addEventListener('click', checkBtnListener);
  starBtn.addEventListener('click', starBtnListener);

  return reminderElem;
}

function generateReminderChildren(reminder, reminderElem){
  let title = document.createElement('h4');
  let date = document.createElement('h5');
  let notes = document.createElement('p');
  let check = document.createElement('input');
  let deleteBtn = document.createElement('button');
  let starBtn = document.createElement('input');

  check.setAttribute('type', 'checkbox');
  check.checked = !reminder.isActive;
  deleteBtn.innerHTML = 'Delete Remind';
  starBtn.setAttribute('type', 'checkbox');
  starBtn.setAttribute('class', 'star');
  starBtn.checked = reminder.isStarred;

  let finalDate = shrug;
  let dateOb = new Date(reminder.remindDate);
  let currentDate = new Date();

  if(reminder.remindDate!=null){
    finalDate = generateDateString(dateOb);
    if(dateOb.getTime()<currentDate.getTime()){
      reminderElem.setAttribute('style', 'border: 2px red solid');
    }
  } else if(reminder.remindDate==null){
    reminderElem.setAttribute('style', 'border: 1px yellow solid');
  }

  title.innerHTML = reminder.title;
  date.innerHTML = "Date: " + finalDate;
  notes.innerHTML = reminder.notes;

  return {title, date, notes, check, deleteBtn, starBtn};
}

function deleteBtnListener(e){
  let result = confirm('This remind will be deleted forever (a long time!)');
  if(result){
    e.target.parentNode.parentNode.removeChild(e.target.parentNode);
    socket.emit('deleteRemind', 
      {title: e.target.parentNode.children[0].innerHTML, userEmail: userInfo.user.email});
    
    sentReminds = sentReminds.filter(remind=>{
      return remind.title!=e.target.parentNode.children[0].innerHTML;
    });
  }
}

function checkBtnListener(e){
  socket.emit('updateActive', {isActive: !e.target.checked, title: e.target.parentNode.children[0].innerHTML,
    userEmail:userInfo.user.email});
}

function starBtnListener(e){
  socket.emit('updateStarred', {isStarred: e.target.checked, title: e.target.parentNode.children[0].innerHTML,
    userEmail:userInfo.user.email});
}

function generateDateString(dateOb){
  const year = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(dateOb);
  const month = new Intl.DateTimeFormat('en', { month: 'long' }).format(dateOb);
  const day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(dateOb);
  const hour = new Intl.DateTimeFormat('en', { hour: '2-digit' }).format(dateOb);
  const minute = new Intl.DateTimeFormat('en', { minute: '2-digit' }).format(dateOb);
  return (month + " " + day + ", " + year + "  |  " + 
                  hour.split(' ')[0] + ":" + minute +  " " +  hour.split(' ')[1].toLowerCase());  
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
    if(x.children[5].checked){
      return -1;
    }else if(y.children[5].checked){
      return 1;
    }

    if(y.children[1].innerHTML.substr(6) == shrug){
      return -1;
    }else if(x.children[1].innerHTML.substr(6) == shrug){
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

function filterActive(reminderArr) {
  let elemArr = [];

  reminderArr.filter(reminder=>reminder.isActive).forEach(reminder=>{
    elemArr.push(createRemindElem(reminder));
  });
  return elemArr;
}
function filterInactive(reminderArr) {
  let elemArr = [];

  reminderArr.filter(reminder=>!reminder.isActive).forEach(reminder=>{
    elemArr.push(createRemindElem(reminder));
  });
  return elemArr;
}

function filterAll(reminderArr) {
  let elemArr = [];

  reminderArr.forEach(reminder=>{
    elemArr.push(createRemindElem(reminder));
  });

  return elemArr;
}

function filterDay(reminderArr) {
  let elemArr = [];

  reminderArr.filter(reminder=>isToday(new Date(reminder.remindDate))).forEach(reminder=>{
    elemArr.push(createRemindElem(reminder));
  });

  return elemArr;
}

function filterStarred(reminderArr) {
  let elemArr = [];

  reminderArr.filter(reminder=>reminder.isStarred).forEach(reminder=>{
    elemArr.push(createRemindElem(reminder));
  });

  return elemArr;
}

function filterUnstarred(reminderArr) {
  let elemArr = [];

  reminderArr.filter(reminder=>!reminder.isStarred).forEach(reminder=>{
    elemArr.push(createRemindElem(reminder));
  });

  return elemArr;
}

function isToday(someDate) {
  const today = new Date();
  return someDate.getDate() == today.getDate() &&
    someDate.getMonth() == today.getMonth() &&
    someDate.getFullYear() == today.getFullYear()
}

function setAlarms(reminderArr){
  reminderArr.forEach(remind=>{
    let date = new Date(remind.remindDate);
    if(isToday(date)){

      var t = date - new Date();

      setTimeout(function(){
         send('Reminder: ' + remind.title); 
        }, t);
    }
  });
}