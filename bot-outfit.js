globalThis.CabinOutfit = (() => {
  const options={
    hat:{name:'头部',styles:{
      baseball:'靛蓝鸭舌帽',sailor:'奶油水手帽',traveler:'烟棕旅行帽',sprout:'豆芽头饰',headphones:'复古耳机',
      strawHat:'浅麦草帽',aviator:'焦糖飞行帽',cookHat:'米白厨师帽'
    }},
    glasses:{name:'眼镜',styles:{
      round:'复古圆框',square:'靛蓝方框',amber:'琥珀细框',blackSun:'炭黑方框墨镜',teaSun:'茶色圆框墨镜'
    }},
    scarf:{name:'围巾',styles:{knit:'砖红针织',stripe:'松绿条纹',kerchief:'姜黄方巾'}},
    eyes:{name:'眼睛表情',styles:{happy:'月牙眼',wink:'单眼眨',curious:'好奇眼'}},
    sign:{name:'木牌',styles:{cabin:'小屋字样',name:'Bot 名字',note:'音符图案'}},
    back:{name:'背部',styles:{case:'迷你琴盒'}},
    carry:{name:'随身物件',styles:{lantern:'暖光小提灯'}},
    effect:{name:'跟随特效',styles:{fireflies:'萤火虫'}}
  };
  const categories=Object.keys(options);

  function normalize(raw){
    return Object.fromEntries(categories.map(key=>{
      const style=raw?.[key];
      return [key,typeof style==='string'&&Object.hasOwn(options[key].styles,style)?style:'none'];
    }));
  }

  function active(raw){
    return Object.fromEntries(Object.entries(normalize(raw)).filter(([,style])=>style!=='none'));
  }

  return {options,categories,normalize,active};
})();
