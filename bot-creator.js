window.CabinBotCreator = (() => {
  const {options,normalize}=CabinBotAccessories;
  const {portrait}=CabinCharacters;

  function outfitControls(form,initial) {
    const outfit=normalize(initial),panel=form.querySelector('.bc-outfit-options');
    const fields=Object.entries(options).map(([key,{name,styles}])=>{
      const field=document.createElement('div'),label=document.createElement('label'),select=document.createElement('select');
      select.id=form.id+'-'+key;select.name='outfit-'+key;
      label.htmlFor=select.id;label.textContent=name;
      select.add(new Option('无', 'none'));
      for(const [id,title] of Object.entries(styles))select.add(new Option(title,id));
      select.value=outfit[key];
      field.append(label,select);panel.append(field);
      return [key,select];
    });
    return ()=>Object.fromEntries(fields.map(([key,select])=>[key,select.value]));
  }

  function showError(error, message) {
    error.textContent=message;error.hidden=false;
    error.scrollIntoView({block:'nearest'});
  }

  function mount(container, onSubmit, onCancel) {
    const {colors, shapes} = window.CabinBotCatalog;
    const {roles} = window.CabinCharacters;
    const form = document.createElement('form');
    form.id = 'botCreateForm';
    form.className = 'bc-form';
    form.setAttribute('aria-label', '新增 Bot');
    form.innerHTML = `
      <div class="bc-intro">
        <div class="bc-stage"><img class="bc-portrait" width="80" height="80" alt="Bot 外观预览"></div>
        <div class="bc-name">
          <label for="newBotName">Bot 名字</label>
          <input id="newBotName" name="name" type="text" maxlength="20" placeholder="给它起个名字" required>
        </div>
      </div>
      <fieldset><legend>外形 <span class="bc-current-shape"></span></legend><div class="bc-shapes"></div></fieldset>
      <fieldset><legend>颜色 <span class="bc-current-color"></span></legend><div class="bc-colors"></div></fieldset>
      <fieldset><legend>装饰</legend><div class="bc-outfit-options"></div></fieldset>
      <div class="bc-work">
        <label for="newBotSkill">它在小屋做什么？</label>
        <select id="newBotSkill" name="skill" aria-describedby="newBotSkillHint"></select>
        <p id="newBotSkillHint" class="bc-hint"></p>
      </div>
      <div class="bc-external" hidden>
        <label for="newBotUrl">Bot 网址</label>
        <input id="newBotUrl" type="url" name="url" placeholder="https://…" pattern="https://.+" title="请输入以 https:// 开头的完整网址" autocapitalize="off" spellcheck="false" disabled>
        <label for="newBotJob">工作名称 <span>（选填）</span></label>
        <input id="newBotJob" type="text" name="job" placeholder="外部助手" maxlength="20" disabled>
        <label for="newBotInstructions">可带到 Grok 的能力说明 <span>（选填）</span></label>
        <textarea id="newBotInstructions" name="instructions" rows="3" placeholder="贴入作者提供的 Prompt，或写清这项工作的输入、步骤和交付内容。" disabled></textarea>
      </div>
      <p class="bc-error" role="alert" hidden></p>
      <div class="bc-actions">
        <button type="button" class="bc-cancel">返回名册</button>
        <button type="submit" class="act" id="createBotSubmit">加入小屋</button>
      </div>
      <p class="bc-storage">新增的 Bot 保存在当前浏览器。</p>`;

    const readOutfit = outfitControls(form);
    const field = form.elements;
    const preview = form.querySelector('.bc-portrait');
    const shapeRow = form.querySelector('.bc-shapes');
    const colorRow = form.querySelector('.bc-colors');
    const externalFields = form.querySelector('.bc-external');
    const hint = form.querySelector('.bc-hint');
    const error = form.querySelector('.bc-error');

    function addChoice(row, group, choice, face, checked) {
      const label = document.createElement('label');
      label.className = 'bc-choice';
      label.title = choice.name;
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = group;
      radio.value = choice.value;
      radio.checked = checked;
      radio.setAttribute('aria-label', choice.name);
      label.append(radio, face);
      row.append(label);
    }

    shapes.forEach((shape, index) => {
      const face = document.createElement('span');
      const image = document.createElement('img');
      image.alt = '';
      image.width = image.height = 40;
      face.append(image);
      addChoice(shapeRow, 'shape', shape, face, index === 0);
    });
    colors.forEach((color,index) => {
      const face = document.createElement('span');
      face.style.setProperty('--bot-color', color.value);
      addChoice(colorRow, 'color', color, face, index === 0);
    });
    for (const role of roles) field.skill.add(new Option((role.guest ?? role).job, role.id));
    field.skill.add(new Option('接入第三方 Bot', 'external'));

    function updatePreview() {
      preview.src = portrait(field.shape.value, field.color.value, readOutfit());
    }

    function updateAppearance() {
      updatePreview();
      form.querySelector('.bc-current-shape').textContent = shapes.find(s => s.value === field.shape.value).name;
      form.querySelector('.bc-current-color').textContent = colors.find(c => c.value === field.color.value).name;
      shapeRow.querySelectorAll('img').forEach((image, index) => {
        image.src = portrait(shapes[index].value, field.color.value);
      });
    }

    function updateSkill() {
      const external = field.skill.value === 'external';
      externalFields.hidden = !external;
      field.url.disabled = field.job.disabled = field.instructions.disabled = !external;
      field.url.required = external;
      const role = roles.find(candidate => candidate.id === field.skill.value);
      hint.textContent = external ? '访客可以从它的名片在新标签页打开这个网址。' :
        '访客可以让它「' + (role.guest ?? role).tool + '」。';
    }

    form.addEventListener('change', ({target}) => {
      if (target.name === 'color' || target.name === 'shape') updateAppearance();
      if (target.name?.startsWith('outfit-')) updatePreview();
      if (target === field.skill) updateSkill();
    });
    form.addEventListener('input', () => { error.hidden = true; });
    form.querySelector('.bc-cancel').addEventListener('click', onCancel);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const external = field.skill.value === 'external';
      const result = onSubmit({
        name: field.namedItem('name').value,
        shape: field.shape.value,
        color: field.color.value,
        outfit: readOutfit(),
        skill: field.skill.value,
        url: external ? field.url.value : '',
        job: external ? field.job.value.trim() || '外部助手' : '',
        instructions: external ? field.instructions.value.trim() : ''
      });
      if (!result.ok) showError(error,result.error);
    });
    updateAppearance();
    updateSkill();
    container.replaceChildren(form);
  }

  function mountOutfit(container,bot,onSubmit,onCancel) {
    const form=document.createElement('form');
    form.id='botOutfitForm';form.className='bc-form';form.setAttribute('aria-label','Bot 装饰');
    form.innerHTML=`
      <div class="bc-stage"><img class="bc-portrait" width="158" height="158" alt="Bot 外观预览"></div>
      <div class="bc-outfit-options"></div>
      <p class="bc-error" role="alert" hidden></p>
      <div class="bc-actions">
        <button type="button" class="bc-cancel">取消</button>
        <button type="submit" class="act">保存装饰</button>
      </div>`;
    const readOutfit=outfitControls(form,bot.outfit),error=form.querySelector('.bc-error');
    const image=form.querySelector('.bc-portrait');
    const updatePreview=()=>{image.src=portrait(bot.shape,bot.color,readOutfit());};
    form.addEventListener('change',()=>{error.hidden=true;updatePreview();});
    form.querySelector('.bc-cancel').addEventListener('click',onCancel);
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const result=onSubmit(readOutfit());
      if(!result.ok)showError(error,result.error);
    });
    updatePreview();
    container.replaceChildren(form);
  }
  return {mount,mountOutfit};
})();
