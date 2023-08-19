// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import TerminalTestSuite from "./tests";
import asyncSleep from "@terminal/utils/async_sleep";
import uniqueId from "@terminal/utils/unique_id";
import getOdooVersionMajor from "@odoo/utils/get_odoo_version_major";

export default class TestCommon extends TerminalTestSuite {
  // Can't test 'lang'
  // Can't test 'reload'
  // Can't test 'debug'
  // Can't test 'post': No endpoint to test
  // Can't test 'jstest'
  // Can't test 'logout'

  /**
   * @override
   */
  async onBeforeTest(test_name) {
    const res = await super.onBeforeTest(arguments);
    if (test_name === "test_context") {
      const context = await this.terminal.execute("context", false, true);
      this._orig_context = context;
    }
    return res;
  }

  /**
   * @override
   */
  async onAfterTest(test_name) {
    const res = await super.onAfterTest(arguments);
    if (test_name === "test_context" || test_name === "test_context_no_arg") {
      return this.terminal.execute(
        `context -o set -v '${JSON.stringify(this._orig_context)}'`,
        false,
        true
      );
    }
    return res;
  }

  async test_create() {
    await this.terminal.execute("create -m res.partner", false, true);
    await asyncSleep(800);
    this.assertTrue(this.isFormOpen());
    const recordset = await this.terminal.execute(
      `create -m res.partner -v {name: '${uniqueId("This is a Test #")}'}`,
      false,
      true
    );
    this.assertEqual(recordset.model, "res.partner");
    this.assertEqual(recordset.length, 1);
  }

  async test_unlink() {
    const record = await this.terminal.execute(
      `create -m res.partner -v {name: '${uniqueId("This is a Test #")}'}`,
      false,
      true
    );
    const res = await this.terminal.execute(
      `unlink -m res.partner -i ${record.id}`,
      false,
      true
    );
    this.assertTrue(res);
  }

  async test_write() {
    const record_a = await this.terminal.execute(
      `create -m res.partner -v {name: '${uniqueId("This is a Test #")}'}`,
      false,
      true
    );
    const record_b = await this.terminal.execute(
      `create -m res.partner -v {name: '${uniqueId("This is a Test #")}'}`,
      false,
      true
    );
    let res = await this.terminal.execute(
      `write -m res.partner -i ${record_a.id} -v {name: '${uniqueId(
        "Other name Test #"
      )}'}`,
      false,
      true
    );
    this.assertTrue(res);
    res = await this.terminal.execute(
      `write -m res.partner -i "${record_a.id}, ${
        record_b.id
      }" -v {name: '${uniqueId("Other name Test #")}'}`,
      false,
      true
    );
    this.assertTrue(res);
  }

  async test_search() {
    const res = await this.terminal.execute(
      "search -m res.partner -f name -d [[id, >, 1]] -l 3 -of 2 -o 'id desc'",
      false,
      true
    );
    this.assertEqual(res.length, 3);
  }

  async test_call() {
    const res = await this.terminal.execute(
      "call -m res.partner -c address_get -a [1]",
      false,
      true
    );
    this.assertNotEmpty(res);
  }

  async test_install() {
    await asyncSleep(10000);
    const res = await this.terminal.execute("install -m account", false, true);
    this.assertEqual(res[0]?.name, "account");
    await asyncSleep(10000);
  }

  async test_upgrade() {
    await asyncSleep(10000);
    const res = await this.terminal.execute("upgrade -m account", false, true);
    this.assertEqual(res[0]?.name, "account");
    await asyncSleep(10000);
  }

  async test_uninstall() {
    await asyncSleep(10000);
    const res = await this.terminal.execute(
      "uninstall -m account --force",
      false,
      true
    );
    this.assertEqual(res?.name, "account");
    await asyncSleep(10000);
  }

  async test_action() {
    let res = await this.terminal.execute("action -a 5", false, true);
    this.assertEqual(res.id, 5);
    const OdooVer = getOdooVersionMajor();
    if (OdooVer >= 15) {
      res = await this.terminal.execute(
        "action -a base.action_res_company_form",
        false,
        true
      );
      this.assertEqual(res.id, "base.action_res_company_form");
      res = await this.terminal.execute(
        "action -a {type: 'ir.actions.act_window', res_model: 'res.partner', view_type: 'form', view_mode: 'form', views: [[false, 'form']], target: 'current', res_id: 1}",
        false,
        true
      );
      this.assertNotEmpty(res);
    } else {
      res = await this.terminal.execute(
        "action -a base.action_res_company_form",
        false,
        true
      );
      this.assertEqual(res.xml_id, "base.action_res_company_form");
      res = await this.terminal.execute(
        "action -a {type: 'ir.actions.act_window', res_model: 'res.partner', view_type: 'form', view_mode: 'form', views: [[false, 'form']], target: 'current', res_id: 1}",
        false,
        true
      );
      this.assertEqual(res.res_model, "res.partner");
      this.assertEqual(res.res_id, 1);
    }
  }

  async test_whoami() {
    const res = await this.terminal.execute("whoami", false, true);
    this.assertEqual(res?.login, "admin");
  }

  async test_caf() {
    const res = await this.terminal.execute(
      "caf -m res.partner -f type -fi {searchable: true}",
      false,
      true
    );
    this.assertNotEmpty(res.type);
    this.assertEmpty(res.id);
  }

  async test_cam() {
    let res = await this.terminal.execute(
      "cam -m res.partner -o create",
      false,
      true
    );
    this.assertTrue(res);
    res = await this.terminal.execute(
      "cam -m res.partner -o unlink",
      false,
      true
    );
    this.assertTrue(res);
    res = await this.terminal.execute(
      "cam -m res.partner -o write",
      false,
      true
    );
    this.assertTrue(res);
    res = await this.terminal.execute(
      "cam -m res.partner -o read",
      false,
      true
    );
    this.assertTrue(res);
  }

  async test_lastseen() {
    // Only test that can be called
    await this.terminal.execute("lastseen", false, true);
  }

  async test_read() {
    const res = await this.terminal.execute(
      "read -m res.partner -i 1 -f type",
      false,
      true
    );
    this.assertEqual(res[0]?.id, 1);
    this.assertNotEmpty(res[0]?.type);
    this.assertEmpty(res[0]?.display_name);
  }

  async test_context() {
    let res = await this.terminal.execute("context", false, true);
    this.assertIn(res, "uid");
    res = await this.terminal.execute("context -o read", false, true);
    this.assertIn(res, "uid");
    // At the moment operations with the context are not possible in legacy mode
    const OdooVer = getOdooVersionMajor();
    if (OdooVer < 15) {
      res = await this.terminal.execute(
        "context -o write -v {test_key: 'test_value'}",
        false,
        true
      );
      this.assertIn(res, "test_key");
      res = await this.terminal.execute(
        "context -o set -v {test_key: 'test_value_change'}",
        false,
        true
      );
      this.assertEqual(res.test_key, "test_value_change");
      res = await this.terminal.execute(
        "context -o delete -v test_key",
        false,
        true
      );
      this.assertNotIn(res, "test_key");
    }
  }

  async test_version() {
    const res = await this.terminal.execute("version", false, true);
    this.assertTrue(res);
  }

  // FIXME: Odoo 16.0 has some issues to load 'bus' module. So it is not
  // accessible until after some time...
  // test_longpolling: async function () {
  //     let res = await this.terminal.execute(
  //         "longpolling -o verbose",
  //         false,
  //         true
  //     );
  //     this.assertTrue(res);
  //     res = await this.terminal.execute(
  //         "longpolling -o off",
  //         false,
  //         true
  //     );
  //     this.assertTrue(res);
  //     res = await this.terminal.execute(
  //         "longpolling -o add_channel -p test_channel",
  //         false,
  //         true
  //     );
  //     this.assertTrue(res);
  //     res = await this.terminal.execute(
  //         "longpolling -o del_channel -p test_channel",
  //         false,
  //         true
  //     );
  //     this.assertTrue(res);
  //     res = await this.terminal.execute(
  //         "longpolling -o stop",
  //         false,
  //         true
  //     );
  //     this.assertTrue(res);
  //     res = await this.terminal.execute(
  //         "longpolling -o start",
  //         false,
  //         true
  //     );
  //     this.assertTrue(res);
  // },

  // async _isLogin(login) {
  //     const res = await this.terminal.execute("whoami", false, true);
  //     return res?.login === login;
  // }

  // FIXME: login tests cause problems on new Odoo versions
  // test_login: async function () {
  //     // Get active database
  //     // FIXME: This type of calls are ugly, maybe some day
  //     // can scan the dependencies.
  //     let res = await this.terminal.execute(
  //         "dblist --only-active",
  //         false,
  //         true
  //     );
  //     const dbname = res;
  //     res = await this.terminal.execute(
  //         `login -d ${dbname} -u demo -p demo --no-reload`,
  //         false,
  //         true
  //     );
  //     this.assertTrue(res);
  //     this.assertTrue(await this._isLogin("demo"));
  //     res = await this.terminal.execute(
  //         `login -d ${dbname} -u #admin --no-reload`,
  //         false,
  //         true
  //     );
  //     this.assertTrue(res);
  //     this.assertTrue(await this._isLogin("admin"));
  // },

  async test_uhg() {
    const res = await this.terminal.execute(
      "uhg -g base.group_user",
      false,
      true
    );
    this.assertTrue(res);
  }

  async test_dblist() {
    let res = await this.terminal.execute("dblist", false, true);
    this.assertNotEmpty(res);

    res = await this.terminal.execute("dblist --only-active", false, true);
    this.assertEqual(typeof res, "string");
  }

  async test_tour() {
    // This test is incomplete to avoid page reloads
    const res = await this.terminal.execute("tour", false, true);
    this.assertNotEmpty(res);
  }

  async test_json() {
    const res = await this.terminal.execute(
      "json -e /web_editor/get_assets_editor_resources -d {key:'web.assets_backend'}",
      false,
      true
    );
    this.assertIn(res, "views");
  }

  async test_depends() {
    const res = await this.terminal.execute("depends -m mail", false, true);
    this.assertNotEmpty(res);
  }

  async test_ual() {
    const res = await this.terminal.execute("ual", false, true);
    this.assertTrue(res);
  }

  async test_count() {
    const res = await this.terminal.execute(
      "count -m res.partner",
      false,
      true
    );
    this.assertTrue(res > 0);
    const resb = await this.terminal.execute(
      "count -m res.partner -d [['type', '=', 'contact']]",
      false,
      true
    );
    this.assertTrue(resb <= res);
  }

  async test_ref() {
    const res = await this.terminal.execute(
      "ref -x base.main_company,base.model_res_partner",
      false,
      true
    );
    this.assertNotEmpty(res);
    this.assertEqual(res.length, 2);
  }

  async test_rpc() {
    const res = await this.terminal.execute(
      "rpc -o {route: '/jsonrpc', method: 'server_version', params: {service: 'db'}}",
      false,
      true
    );
    this.assertNotEmpty(res);
  }

  async test_metadata() {
    const res = await this.terminal.execute(
      "metadata -m res.partner -i 1",
      false,
      true
    );
    this.assertNotEmpty(res);
    this.assertEqual(res.xmlid, "base.main_partner");
  }

  async test_barcode() {
    let res = await this.terminal.execute("barcode -o info", false, true);
    this.assertNotEmpty(res);
    await this.terminal.execute("view -m res.company -i 1", false, true);
    await asyncSleep(2500);
    res = await this.terminal.execute(
      "barcode -o send -d O-CMD.EDIT",
      false,
      true
    );
    this.assertNotEmpty(res);
    res = await this.terminal.execute(
      "barcode -o send -d O-CMD.DISCARD,O-CMD.EDIT,O-CMD.DISCARD",
      false,
      true
    );
    this.assertNotEmpty(res);
  }
}
