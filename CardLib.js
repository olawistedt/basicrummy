



function preloadAssets(scene) {
  scene.load.image('back', 'assets/cards/back03.svg');

  scene.load.image('jk_b', 'assets/cards/white_jk_b.svg');
  scene.load.image('jk_r', 'assets/cards/white_jk_r.svg');

  scene.load.image('c02', 'assets/cards/white_c_2.svg');
  scene.load.image('c03', 'assets/cards/white_c_3.svg');
  scene.load.image('c04', 'assets/cards/white_c_4.svg');
  scene.load.image('c05', 'assets/cards/white_c_5.svg');
  scene.load.image('c06', 'assets/cards/white_c_6.svg');
  scene.load.image('c07', 'assets/cards/white_c_7.svg');
  scene.load.image('c08', 'assets/cards/white_c_8.svg');
  scene.load.image('c09', 'assets/cards/white_c_9.svg');
  scene.load.image('c10', 'assets/cards/white_c_10.svg');
  scene.load.image('c11', 'assets/cards/white_c_j.svg');
  scene.load.image('c12', 'assets/cards/white_c_q.svg');
  scene.load.image('c13', 'assets/cards/white_c_k.svg');
  scene.load.image('c14', 'assets/cards/white_c_a.svg');

  scene.load.image('d02', 'assets/cards/white_d_2.svg');
  scene.load.image('d03', 'assets/cards/white_d_3.svg');
  scene.load.image('d04', 'assets/cards/white_d_4.svg');
  scene.load.image('d05', 'assets/cards/white_d_5.svg');
  scene.load.image('d06', 'assets/cards/white_d_6.svg');
  scene.load.image('d07', 'assets/cards/white_d_7.svg');
  scene.load.image('d08', 'assets/cards/white_d_8.svg');
  scene.load.image('d09', 'assets/cards/white_d_9.svg');
  scene.load.image('d10', 'assets/cards/white_d_10.svg');
  scene.load.image('d11', 'assets/cards/white_d_j.svg');
  scene.load.image('d12', 'assets/cards/white_d_q.svg');
  scene.load.image('d13', 'assets/cards/white_d_k.svg');
  scene.load.image('d14', 'assets/cards/white_d_a.svg');

  scene.load.image('h02', 'assets/cards/white_h_2.svg');
  scene.load.image('h03', 'assets/cards/white_h_3.svg');
  scene.load.image('h04', 'assets/cards/white_h_4.svg');
  scene.load.image('h05', 'assets/cards/white_h_5.svg');
  scene.load.image('h06', 'assets/cards/white_h_6.svg');
  scene.load.image('h07', 'assets/cards/white_h_7.svg');
  scene.load.image('h08', 'assets/cards/white_h_8.svg');
  scene.load.image('h09', 'assets/cards/white_h_9.svg');
  scene.load.image('h10', 'assets/cards/white_h_10.svg');
  scene.load.image('h11', 'assets/cards/white_h_j.svg');
  scene.load.image('h12', 'assets/cards/white_h_q.svg');
  scene.load.image('h13', 'assets/cards/white_h_k.svg');
  scene.load.image('h14', 'assets/cards/white_h_a.svg');

  scene.load.image('s02', 'assets/cards/white_s_2.svg');
  scene.load.image('s03', 'assets/cards/white_s_3.svg');
  scene.load.image('s04', 'assets/cards/white_s_4.svg');
  scene.load.image('s05', 'assets/cards/white_s_5.svg');
  scene.load.image('s06', 'assets/cards/white_s_6.svg');
  scene.load.image('s07', 'assets/cards/white_s_7.svg');
  scene.load.image('s08', 'assets/cards/white_s_8.svg');
  scene.load.image('s09', 'assets/cards/white_s_9.svg');
  scene.load.image('s10', 'assets/cards/white_s_10.svg');
  scene.load.image('s11', 'assets/cards/white_s_j.svg');
  scene.load.image('s12', 'assets/cards/white_s_q.svg');
  scene.load.image('s13', 'assets/cards/white_s_k.svg');
  scene.load.image('s14', 'assets/cards/white_s_a.svg');
}

function colorFullName(e) {
  let color;
  switch (e) {
    case 'c':
      color = 'CLUBS';
      break;
    case 'd':
      color = 'DIAMONDS';
      break;
    case 'h':
      color = 'HEARTS';
      break;
    case 's':
      color = 'SPADES';
  }
  return color;
}
