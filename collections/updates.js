/**
  * Updates are status updates to petitions.
  *
  * They are the intermediary information that is relevant to a petition, but
  * not the final answer to the petitioner's request.
  *
  * Use cases include the formation of committees to investigate the petition
  * topic, scheduled meetings with administrators, and so forth.
  *
  **/

Updates = new Meteor.Collection('updates');

var validateUpdate = function (updateAttrs, petition) {

  if (!updateAttrs.title || updateAttrs.title.length > 80)
    throw new Meteor.Error(422, "Title is longer than 80 characters or not present.");

  if (!updateAttrs.description)
    throw new Meteor.Error(422, "Description is not present.");

  if (!updateAttrs.petitionId)
    throw new Meteor.Error(422, "The title's petitionId is missing.");

};

Meteor.methods({
  'createUpdate': function (updateAttrs) {

    var user = Meteor.user();

    if (!Roles.userIsInRole(user, ['admin', 'moderator']))
      throw new Meteor.Error(403, "You are not authorized to create updates.");

    var petition = Petitions.findOne(updateAttrs.petitionId);
    validateUpdate(updateAttrs, petition);

    var existingUpdates = Updates.find({petitionId: updateAttrs.petitionId});
    var update = _.extend(_.pick(updateAttrs, 'title', 'description', 'petitionId'), {
      created_at: new Date().getTime(),
      updated_at: new Date().getTime(),
      author: user.profile.name,
      userId: user._id
    });

    var updateId = Updates.insert(update);
    if(Meteor.isServer){
      if (_.isEmpty(petition.response)) {
        Petitions.update(updateAttrs.petitionId, {$set: {status: "waiting-for-reply"}});
      }

      var users = Meteor.users.find({$and: [{'notify.updates': true},
                                           {_id: {$in: petition.subscribers}}]},
                                    {fields: {username: 1}});

      var emails = users.map(function (user) { return user.username + Meteor.settings.MAIL.default_domain; });

      Mailer.sendTemplatedEmail("petition_status_update", {
        bcc: emails
      }, {
        petition: petition
      });
    }
    return updateId;
  },
  'editUpdate': function (updateAttrs) {

    var user = Meteor.user();

    if (!Roles.userIsInRole(user, ['admin', 'moderator']))
      throw new Meteor.Error(403, "You are not authorized to edit updates.");

    var petition = Petitions.findOne(updateAttrs.petitionId);
    validateUpdate(updateAttrs, petition);

    var update = _.extend(_.pick(updateAttrs, 'title', 'description', 'petitionId'), {
      updated_at: new Date().getTime(),
      author: user.profile.name,
      userId: user._id
    });

    Updates.update(updateAttrs._id, {$set: update });

  },
  'deleteUpdate': function (updateAttrs) {

    var user = Meteor.user();

    if (!Roles.userIsInRole(user, ['admin', 'moderator']))
      throw new Meteor.Error(403, "You are not authorized to delete updates.");

    Updates.remove(updateAttrs._id);

  }
});
