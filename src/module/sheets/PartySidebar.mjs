import { templatePath } from "../config/constants.mjs";

export default class PartySidebar extends SidebarTab {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "party",
      template: `${templatePath}/party.hbs`,
      title: "UFT.partytab.title",
      dragDrop: [{dragSelector: ".party-list__item", dropSelector: ".party-list"}],
      // filters: [{inputSelector: 'input[name="search"]', contentSelector: ".directory-list"}],
      contextMenuSelector: ".party-list__item",
    });
  }

  static tooltip = "UFT.partytab.title";
  static icon = "fas fa-users";

  static lookupActor(actor) {
    let actorObj = (typeof actor === 'string')
      ? game.actors.get(actor)
      : actor;
  
    return (actorObj?.type !== "character")
      ? null
      : actorObj;
  }

  static isInParty(actor) {
    const actorObj = PartySidebar.lookupActor(actor);
    return (!actorObj)
      ? false
      : actorObj.getFlag(game.system.id, "party");
  }

  static async addToParty(actor) {
    actor = PartySidebar.lookupActor(actor);
    await actor?.setFlag(game.system.id, "party", true);
    ui.sidebar.render();
  }

  static async removeFromParty(actor) {
    actor = PartySidebar.lookupActor(actor);
    await actor?.setFlag(game.system.id, "party", false);
    ui.sidebar.render();
  }


  static async grantItemToPartyMember(actor, item) {
    actor = PartySidebar.lookupActor(actor);
    await actor?.createEmbeddedDocuments('Item', item);
  }

  /** @override */
  async getData(options={}) {
    let context = await super.getData(options);
    context.party = this.partyMembers;
    return context;
  }

  get partyMembers() {
    return game.actors.filter(a => a.getFlag(game.system.id, 'party'));
  }

  _onDragStart(event) {
    const entryId = event.target.closest('[data-entry-id]').dataset.entryId;
    const actor = game.actors.get(entryId);
    if (!actor) return;
    const dragData = actor.toDragData();
    if (!dragData) return;
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /**
   * @override
   * @param  {DragEvent} event - The drag event fired when dropping an item onto the party list 
   */
  async _onDrop(event) {
    const typesAllowed = [
      'Actor',
      'Item',
      'Folder'
    ];

    const performAddToParty = (doc) => {
      if (
        doc &&
        doc.documentName === 'Actor' &&
        !PartySidebar.isInParty(doc.id)
      ) {
        doc.setFlag(game.system.id, 'party', true);
        return true;
      }
    }

    const performAddItemToPartyMember = (actor, item) => {
      if (item.documentName !== 'Item') return;
      actor.createEmbeddedDocuments('Item', [item]);
      return true;
    }
    
    const targetId = event.target.closest('[data-entry-id]')?.dataset.entryId;
    const {type, uuid} = TextEditor.getDragEventData(event);

    // Kick out things that aren't actors or embedded into actors
    if (!typesAllowed.includes(type)) return;

    // An item can't be a party member.
    // It must be dropped onto a party member.
    if (type === 'Item' && !targetId) return;

    // This is the latest we can wait to fetch the dropped document
    const sourceDoc = await fromUuid(uuid);

    // If it's not a character, don't allow it to join the party
    // @todo - Maybe this should change in the system
    //         (for mounts, pets, beastfolk, etc)?
    if (type === 'Actor' && (!sourceDoc || sourceDoc?.type !== 'character')) return;
    
    if (performAddToParty(sourceDoc)) return;
    
    // This is the latest we can wait to fetch the target document
    const targetDoc = game.actors.get(targetId);

    if (performAddItemToPartyMember(targetDoc, sourceDoc)) return true;

    if (type === 'Folder') {
      sourceDoc.contents.forEach(doc => {
        if (doc.documentName === 'Item') {
          performAddItemToPartyMember(targetDoc, doc);
          return;
        }

        if (doc.documentName === 'Actor') {
          performAddToParty(doc);
          return;
        }
      })
      return;
    }
  }

  /**
   * @todo - We need a way to get this app from the system.
   */
  #openXPApp() {}

  #openPartyMemberSheet(event) {
    const { entryId } = event.target?.closest('[data-entry-id]')?.dataset;
    game.actors.get(entryId)?.sheet?.render(true);
  }

  /**
   * @todo - Listener for "Distribute XP"
   * @todo - Listener for "Distrbute Treasure"
   * 
   * 
   * @override
   * */
  activateListeners(html) {
    super.activateListeners(html);
    
    html.find(".add-xp").click(this.#openXPApp.bind(this));
    html.find('.thumbnail, .entry-name').click(this.#openPartyMemberSheet.bind(this));

    this._contextMenu(html);
  }

  /** @override */
  _contextMenu(html) {
    ContextMenu.create(this, html, this.options.contextMenuSelector, this._getEntryContextOptions());
  }

  /**
   * Get the set of ContextMenu options which should be used for party members
   * @returns {object[]}   The Array of context options passed to the ContextMenu instance
   * @protected
   */
  _getEntryContextOptions() {

    return [
      {
        name: 'UFT.partytab.removeFromParty',
        icon: '<i class="fa-light fa-users"></i>',
        condition: (node) => PartySidebar.isInParty(node.data('entry-id')) === true,
        callback: (node) => game.user.isGM && PartySidebar.removeFromParty(node.data('entry-id'))
      }
    ]

    // return [
    //   {
    //     name: "FOLDER.Clear",
    //     icon: '<i class="fas fa-folder"></i>',
    //     condition: header => {
    //       const li = header.closest(".directory-item");
    //       const entry = this.collection.get(li.data("entryId"));
    //       return game.user.isGM && !!entry.folder;
    //     },
    //     callback: header => {
    //       const li = header.closest(".directory-item");
    //       const entry = this.collection.get(li.data("entryId"));
    //       entry.update({folder: null});
    //     }
    //   },
    //   {
    //     name: "SIDEBAR.Delete",
    //     icon: '<i class="fas fa-trash"></i>',
    //     condition: () => game.user.isGM,
    //     callback: header => {
    //       const li = header.closest(".directory-item");
    //       const entry = this.collection.get(li.data("entryId"));
    //       if ( !entry ) return;
    //       return entry.deleteDialog({
    //         top: Math.min(li[0].offsetTop, window.innerHeight - 350),
    //         left: window.innerWidth - 720
    //       });
    //     }
    //   },
    //   {
    //     name: "SIDEBAR.Duplicate",
    //     icon: '<i class="far fa-copy"></i>',
    //     condition: () => game.user.isGM || this.collection.documentClass.canUserCreate(game.user),
    //     callback: header => {
    //       const li = header.closest(".directory-item");
    //       const original = this.collection.get(li.data("entryId"));
    //       return original.clone({name: `${original._source.name} (Copy)`}, {save: true});
    //     }
    //   }
    // ];
  }
}