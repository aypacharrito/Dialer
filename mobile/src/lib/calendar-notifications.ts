import * as Notifications from 'expo-notifications';
import {calendarNotificationPlan,reconcileCalendarNotifications,type CalendarItem} from './calendar-reminders';
let queue=Promise.resolve();
export function updateCalendarNotifications(items:CalendarItem[],accountId:string,enabled:boolean,cleanup=false){
 const task=queue.then(async()=>{
  const permitted=enabled&&(await Notifications.getPermissionsAsync()).status==='granted';
  if(permitted)await Notifications.setNotificationChannelAsync('calendar',{name:'Calendar reminders',importance:Notifications.AndroidImportance.HIGH});
  await reconcileCalendarNotifications(permitted?calendarNotificationPlan(items,accountId):[],{
   list:()=>Notifications.getAllScheduledNotificationsAsync(),
   cancel:id=>Notifications.cancelScheduledNotificationAsync(id),
   schedule:item=>Notifications.scheduleNotificationAsync({identifier:item.identifier,content:{title:item.title,body:item.body,sound:'default',data:{type:'calendar',accountId,leadId:item.leadId,fingerprint:JSON.stringify([item.at,item.title,item.body])}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(item.at),channelId:'calendar'}}),
  },cleanup?accountId:undefined);
 });
 queue=task.catch(()=>undefined);return task;
}
