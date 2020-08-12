console.log('Service worker loaded');

self.addEventListener('push', e=>{
  const data = e.data.json();


  //icon is the favicon you want to show to user (should be same as site favicon)
  self.registration.showNotification(data.title, {
    body: '',
    icon: ''
  });
});