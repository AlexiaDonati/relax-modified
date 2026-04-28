/*** Copyright 2018 Johannes Kessler
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import * as React from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '../components/navigation';
import { NavigationMobile } from '../components/navigation-mobile';

require('./landing.css');

export class Landing extends React.Component {

	render() {
		return (
			<div className="view-max">

				<Navigation></Navigation>
				<NavigationMobile></NavigationMobile>

				<div className="view-content"><div className="container">

					<div className="jumbotron" id="landing-header-bar">
						<div className="ct logo" id="logos">
							<a href="https://www.fsa.uliege.be" target="_blank"><img src="assets/logos/fsa_logo.png" alt="FSA"/></a>
							<a href="https://www.montefiore.uliege.be" target="_blank"><img src="assets/logos/montefiore_logo.png" alt="Montefiore"/></a>
						</div>

						<div className="col-md-12 ct">
							<h1 id="heading">RelaX - relational algebra calculator</h1>
							<h2>with added support for exercises</h2>
						</div>

						<div className="col-md-12 ct">
							<Link className="btn btn-primary btn-lg getStartedBtn" role="button" to="/relax-modified/calc">Get Started</Link>
						</div>
					</div>

					<h2>About</h2>

					<p>The relational algebra calculator was originally created by Johannes Kessler BSc at <a href="https://dbis-informatik.uibk.ac.at/1-1-Home.html">Databases and Information Systems Group</a> at the <a href="http://informatik.uibk.ac.at/">Institute of Computer Science</a> at the <a href="http://www.uibk.ac.at/index.html.en">University of Innsbruck</a> under supervision of Michael Tschuggnall PhD and Prof. Dr. Günther Specht</p>
					<p>It was later extended with additional features by Alexia Donati under supervision of Prof. Christophe Debruyne</p>
					
					<h2>Features</h2>

					<h3>New features added by Alexia Donati:</h3>
					<h4>Calculator Features</h4>
					<ul>
						<li>Relational Algebra Calculator aligned with the course theory</li>
						<li>Extended Relational Algebra Calculator aligned with the course theory</li>
					</ul>

					<h4>Exercises Features</h4>

					<ul>
						<li>Exercise Maker to create new sets of exercises</li>
						<li>Loading Exercises from local file</li>
						<li>Loading Exercises from remote gist file</li>
					</ul>

					<h4>Verification Features</h4>

					<ul>
						<li>Checking the user solution against a reference solution</li>
							<ul>
								<li>String matching</li>
								<li>ASTs equivalence checking</li>
								<li>Evaluating both solution on the same database instance and comparing the results</li>
								<li>Evaluating both solution on a test battery and comparing the results</li>
							</ul>
					</ul>

					<h3>Features implemented by the original RelaX team:</h3>
					<h4>Calculator Features</h4>
					<ul>
						<li>supports most common operators
							<ul>
								<li>projection</li>
								<li>selection</li>
								<li>rename relations</li>
								<li>rename columns</li>
								<li>group by</li>
								<li>intersect</li>
								<li>union</li>
								<li>set difference</li>
								<li>cross join</li>
								<li>theta join</li>
								<li>natural join</li>
								<li>natural left outer join</li>
								<li>natural right outer join</li>
								<li>natural full outer join</li>
								<li>theta left outer join</li>
								<li>theta right outer join</li>
								<li>theta full outer join</li>
								<li>left semi join</li>
								<li>right semi join</li>
								<li>anti join join</li>

								<li>order by</li>
								<li>duplicate elimination (on bags/multisets)</li>
							</ul>
						</li>
						<li>runs in any modern browser. no plugins needed</li>
						<li>text based approach. lets you write RelAlg as easy as SQL</li>
						<li>code editor with syntax highlighting and code completion</li>
						<li>pre defined sets of relations</li>
						<li>visualize statement in a operator tree</li>
						<li>plain text alternatives for special symbols like &sigma; or <span className="math">⋈</span></li>
						<li>variables can be used to simplify expressions</li>
						<li>new temporal relations can be declared in the statement</li>
						<li>sql like comments</li>
						<li>arbitrary boolean expressions in conditions</li>
						<li>operations keep original order for better traceability</li>
						<li>translates simple SQL-statements to RelAlg
							<ul>
								<li>no support for correlated sub-statements</li>
							</ul>
						</li>
					</ul>

					<h2>Available data</h2>
					You can either use one of the following datasets or create a new one.
					<div className="scroll-x">
					<table className="table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Source</th>
								<th>Language</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Kemper Datenbanksysteme</td>
								<td><a href="http://www3.in.tum.de/teaching/bookDBMSeinf/">Alfons Kemper, André Eickler:
								Datenbanksysteme: Eine Einführung 8. Auflage</a>, Seite 84, Abbildung 3.8
							</td>
								<td>de</td>
							</tr>
							<tr>
								<td>UIBK - KursDB</td>
								<td>Tables from and for the lecture <a
									href="http://dbis-informatik.uibk.ac.at/249-0-VO-Datenbanksysteme.html" target="_blank">Databases:
								Foundations, Data Models and System Concepts - University of Innsbruck</a> chapter 3
							</td>
								<td>de</td>
							</tr>
							<tr>
								<td>UIBK - R, S, T</td>
								<td>Tables from and for the lecture <a
									href="http://dbis-informatik.uibk.ac.at/249-0-VO-Datenbanksysteme.html" target="_blank">Databases:
								Foundations, Data Models and System Concepts - University of Innsbruck</a> chapter 3
							</td>
								<td>de</td>
							</tr>
							<tr>
								<td>The Complete Book - Exercise 2.4.1</td>
								<td>Sample Data from
								<a href="http://infolab.stanford.edu/~ullman/dscb.html">Database Systems The Complete Book 2nd
									Edition by Hector Garcia-Molina, Jeff Ullman, and Jennifer Widom</a>:
								Exercise 2.4.1 Page 52-55
							</td>
								<td>en</td>
							</tr>
							<tr>
								<td>The Complete Book - Exercise 2.4.3</td>
								<td>Sample Data from
								<a href="http://infolab.stanford.edu/~ullman/dscb.html">Database Systems The Complete Book 2nd
									Edition by Hector Garcia-Molina, Jeff Ullman, and Jennifer Widom</a>:
								Exercise 2.4.1 Page 55-57
							</td>
								<td>en</td>
							</tr>
						</tbody>
					</table>
					</div>

					<h2>External resources</h2>

					<p>This tool was not written from scratch but many different external resources/frameworks/projects/libs are used.</p>

					<p>This is a list of resources/frameworks/projects/libs used for this tool (in alphabetical order):</p>
					
					<ul>
						<li><a target="_blank" href="https://babeljs.io/">Babel JavaScript compiler</a></li>
						<li><a target="_blank" href="http://blanketjs.org/">blanket.js</a></li>
						<li><a target="_blank" href="http://botmonster.com/jquery-bootpag/">bootpag</a></li>
						<li><a target="_blank" href="http://getbootstrap.com/">Bootstrap</a></li>
						<li><a target="_blank" href="https://bootstrap-datepicker.readthedocs.org">bootstrap-datepicker</a></li>
						<li><a target="_blank" href="http://bootstraptour.com/">Bootstrap Tour</a></li>
						<li><a target="_blank" href="http://browserify.org/">Browserify</a></li>
						<li><a target="_blank" href="http://codemirror.net/">CodeMirror</a></li>
						<li><a target="_blank" href="http://codepen.io/Pestov/pen/BLpgm">CSS3 family tree by Ilya Pestov</a>
						</li>
						<li><a target="_blank" href="http://www.gnu.org/software/freefont/">FreeSans by GNU FreeFont</a></li>
						<li><a target="_blank" href="http://gruntjs.com/">Grunt</a></li>
						<li><a target="_blank" href="http://handlebarsjs.com/">handlebars</a></li>
						<li><a target="_blank" href="http://handsontable.com/">Handsontable</a></li>
						<li><a target="_blank" href="http://i18next.com/">i18next</a></li>
						<li><a target="_blank" href="http://jquery.com/">jQuery</a></li>
						<li><a target="_blank" href="https://github.com/chjj/marked">marked - a markdown parser</a></li>
						<li><a target="_blank" href="http://pegjs.org/">PEG.js - Parser Generator for JavaScript</a></li>
						<li><a target="_blank" href="http://qunitjs.com/">QUnit - js unit testing</a></li>
						<li><a target="_blank"
							href="https://github.com/tabatkins/railroad-diagrams">tabatkins/railroad-diagrams</a></li>
					</ul>
				</div></div>
			</div>
		);
	}
}
