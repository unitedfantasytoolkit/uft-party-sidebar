import PartySidebar from '../sheets/PartySidebar.mjs';

Hooks.once('setup', async function() {
  class OverrideSidebar extends CONFIG.ui.sidebar {
    getData(options={}) {
      const data = super.getData(options);
      const {chat, combat, ...tabs} = data.tabs;
      const orderedTabs = {
        chat,
        combat,
        party: {
          tooltip: PartySidebar.tooltip,
          icon: PartySidebar.icon
        },
        ...tabs,
      };
      data.tabs = orderedTabs;
      return data;
    }
  }

  if (game.user.isGM) {
    CONFIG.ui.party = PartySidebar;
    CONFIG.ui.sidebar = OverrideSidebar;
  }
});