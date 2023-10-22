import { partialPath, templatePath } from "./constants.mjs";

const prepareHandlebars = async () => {
  Handlebars.registerHelper(
    'partial', 
    (path) => `${partialPath}/${path}`
  )

  Handlebars.registerHelper(
    'signed',
    (value) => {
      if (typeof value !== 'number') throw new TypeError('The `signed` helper must be called with a numeric value');
      return (value < 0) ? value : `+${value}`;
    }
  )

  const templates = await loadTemplates([
    `${templatePath}/party.hbs`,
    `${partialPath}/chip.hbs`
  ]);
}

export default prepareHandlebars;