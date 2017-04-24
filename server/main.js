import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  // code to run on server at startup
  SSL('/home/jshbrmn/zillanet/laptop-linux/projects-learning/2gen/purdue-link/.meteor/host.key','/home/jshbrmn/zillanet/laptop-linux/projects-learning/2gen/purdue-link/.meteor/host.cert', 443);
});
